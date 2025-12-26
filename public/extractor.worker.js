// importScripts('https://cdn.jsdelivr.net/npm/uuid/dist/umd/uuid.min.js');

self.onmessage = async (e) => {
    const name = e.data.name
    if (name == 'start') {
        const result = await ifcsgExtractor(e.data.file, e.data.mapping, e.data.ifcTypes)
        self.postMessage({
            complete: true,
            result: result
        })
    }
}

async function ifcsgExtractor(file, mapping, ifcTypes) {
    const t0 = performance.now()
    console.log('Starting worker');
    const entities = []
    for (const [entity, _] of Object.entries(mapping)) {
        entities.push(entity)
    }

    let entityCount = 0
    let relDefCount = 0
    let psetCount = 0
    let valueCount = 0

    const numberDataTypes = ['IFCVOLUMEMEASURE', 'IFCREAL', 'IFCTHERMALTRANSMITTANCEMEASURE', 'IFCINTEGER', 'IFCLENGTHMEASURE', 'IFCCOUNTMEASURE', 'IFCPOSITIVELENGTHMEASURE', 'IFCPLANEANGLEMEASURE', 'IFCNUMERICMEASURE', 'IFCAREAMEASURE', 'IFCQUANTITYLENGTH', 'IFCMASSMEASURE']
    const stringDataTypes = ['IFCIDENTIFIER', 'IFCLABEL', 'IFCTEXT', 'IFCDURATION', 'IFCDATE', 'IFCDATETIME']

    const entitiesRegex = entities.toString().toUpperCase().replace(/,/g, '|')

    const regexEnt = new RegExp(`=[\\s]?(${entitiesRegex})\\(`)
    //scehema = #(id)=(entity),(guid),geometry,name,description,(objecttype),placement,shape,(tag),(userdefined)
    const regexEntityCatpture = `(.*)=[\\s]?(${entitiesRegex})\\([^;](.*?)'[^;]+?,(\w+|'.*?'|[$]),(\w+|'.*?'|[$]),(\w+|'.*?'|[$]),(?:.+?),(?:.+?),(\w+|'.*?'|[$])(?:,(.*?))?[\\)|,]`

    const regexRel = new RegExp(/=[\s]?IFCRELDEFINESBYPROPERTIES/)




    const regexRelCapture = new RegExp(/IFCRELDEFINESBYPROPERTIES[^;]*\((.*)\),(.*)\)/)

    const regexPset = new RegExp(/=[\s]?(IFCPROPERTYSET|IFCELEMENTQUANTITY)/)
    const regexPsetIgnore = new RegExp(/ArchiCADProperties|ArchiCADQuantities|AC_Pset|AC_Equantity|ARCHICAD|Component Properties/)
    const regexPsetCapture = new RegExp(/(.*)\=[\s]?(?:IFCPROPERTYSET|IFCELEMENTQUANTITY)[^;]*?,'(.*?)'[^;]*\((.*?)\)/)

    const regexValue = new RegExp(/=[\s]?IFCPROPERTYSINGLEVALUE|IFCPROPERTYENUMERATEDVALUE/)
    const regexValueCapture = new RegExp(/(.*)\=[\s]?(?:IFCPROPERTYSINGLEVALUE|IFCPROPERTYENUMERATEDVALUE)\('(.*?)'[^;]\$,(.*?)\((.*)\),/)
    const regexValueNumeric = new RegExp(/(.*)\=[\s]?(?:IFCQUANTITYVOLUME|IFCQUANTITYLENGTH|IFCQUANTITYAREA|IFCQUANTITYWEIGHT)\('(.+?)',[^;]+?,[^;]+?,(\w+|.*?|[$]),/)

    const relMap = new Map();
    const entityMap = new Map()
    const psetMap = new Map()
    const valueMap = new Map()
    const lineMap = new Map()
    const ifcResult = []

    async function firstPass() {
        // let totalLines = 0
        await readFile(file, line => {
            processline(line);
            // totalLines++;
        });

        function processline(line) {
            if (regexEnt.test(line)) {
                const match = line.match(regexEntityCatpture) || []
                if (match.length) {
                    //scehema = #(id)=(entity),(guid),geometry,(name),(description),(objecttype),placement,shape,(tag),(userdefined)
                    entityMap.set(match[1], {
                        Entity: match[2],
                        Guid: match[3],
                        Name: match[4] == '$' ? null : match[4].replace(/\'/g, ""),
                        Description: match[5] == '$' ? null : match[5].replace(/\'/g, ""),
                        ObjectType: match[6] == '$' ? null : match[6].replace(/\'/g, ""),
                        Tag: match[7] == '$' ? null : match[7].replace(/\'/g, ""),
                        PredefinedType: match[8] == null || match[8] == '$' ? null : String(match[8]).replace(/\./g, "")
                    })
                } else {
                    const exceptionString = `IFCBUILDINGSYSTEM`
                    //scehema = #(id)=(entity),(guid),geometry,(name),(description),(objecttype),??,??
                    const exceptionCapture = `(.*)=[\\s]?(${exceptionString})\\([^;](.*?)'[^;]+?,(\w+|'.*?'|[$]),(\w+|'.*?'|[$]),(\w+|'.*?'|[$]),`
                    const match = line.match(exceptionCapture) || []
                    if (match.length) {
                        entityMap.set(match[1], {
                            Entity: match[2],
                            Guid: match[3],
                            Name: match[4].replace(/\'/g, ""),
                            Description: match[5].replace(/\'/g, ""),
                            ObjectType: match[6].replace(/\'/g, ""),
                        })
                    }
                }
                entityCount++
                return;
            }

            if (regexRel.test(line)) {
                const match = line.match(regexRelCapture) || []
                if (match.length) {

                    if (relMap.has(match[1])) {
                        relMap.get(match[1]).push(match[2]);
                    } else {
                        relMap.set(match[1], [match[2]]);
                    }
                }
                relDefCount++
                return;
            }

            if (regexPset.test(line) && !regexPsetIgnore.test(line)) {
                const match = line.match(regexPsetCapture) || []
                if (match.length) {
                    psetMap.set(match[1], {
                        pset: match[2],
                        array: match[3].split(',')
                    })

                    match[3].split(',').map(x => {
                        lineMap.set(x, true)
                    })
                }
                psetCount++
                return;
            }
        }
        // console.log(totalLines);
    }


    async function secondPass() {
        await readFile(file, line => {
            processline(line);
        });

        function processline(line) {
            //get id
            let thisLine = false
            const id = line.match(/(.*)=/) || []

            if (lineMap.has(id[1])) {
                valueCount++
                //match according to datatype
                if (regexValue.test(line)) {
                    if (id[1] == '#5018') {
                        console.log('here2');
                    }
                    const match = line.match(regexValueCapture) || []
                    if (match.length) {
                        const index = match[1]
                        const property = match[2]
                        let dataType = match[3]
                        let rawValue = match[4]
                        let value;

                        if (!dataType) {
                            const propertyFromEnum = rawValue.match(new RegExp(/(\w+)\('([^']+)'\)/))
                            dataType = propertyFromEnum[1]
                            rawValue = propertyFromEnum[2]
                        }

                        if (dataType == 'IFCBOOLEAN') {
                            if (rawValue == '.T.') {
                                value = true;
                            } else if (rawValue == '.F.') {
                                value = false;
                            } else {
                                value = rawValue;
                            }
                        } else if (dataType == 'IFCLOGICAL') {
                            if (rawValue == '.U.') {
                                value = 'UNKNOWN'
                            } else {
                                if (rawValue == '.T.') {
                                    value = true;
                                } else if (rawValue == '.F.') {
                                    value = false;
                                } else {
                                    value = rawValue;
                                }
                            }
                        } else if (numberDataTypes.includes(dataType)) {
                            value = parseFloat(rawValue)
                        } else if (stringDataTypes.includes(dataType)) {
                            value = rawValue.slice(1, -1)
                        }

                        valueMap.set(index, {
                            property: property,
                            value: value
                        })
                    }

                    lineMap.delete(id[1]);
                    return;
                }

                //match as numbers
                if (regexValueNumeric.test(line)) {

                    const matchNumeric = line.match(regexValueNumeric) || []
                    if (matchNumeric.length) {
                        const index = matchNumeric[1]
                        const property = matchNumeric[2]
                        const value = matchNumeric[3]
                        valueMap.set(index, {
                            property: property,
                            value: convertScientificToDecimal(value)
                        })
                    }

                    lineMap.delete(id[1]);
                    return;
                }


            }
            if (lineMap.size === 0) {
                return
            }

        }
    }

    await firstPass()
    await secondPass()

    // console.log('Entity', entityCount, entityMap.size);
    // console.log('RelDef', relDefCount, relMap.size);
    // console.log('Pset', psetCount, psetMap.size);
    // console.log('Value', valueCount, valueMap.size);

    const t1 = performance.now()
    console.log('map in:', convertToFloat((t1 - t0) / 1000), 's');


    const logs = {
        psets: [],
        pset: [],
        prop: []
    }
    for (const [key, obj] of entityMap) {
        const pascalCaseEntity = entities.filter(x => x.toUpperCase() == obj.Entity)
        obj.Entity = pascalCaseEntity[0]
        const psets = relMap.get(key)

        if (!psets) {
            logs.psets.push(`${key},${obj.Entity}`)
            continue;
        }

        for (const psetID of psets) {
            const pset = psetMap.get(psetID)
            if (!pset) {
                logs.pset.push(`${key}, ${psetID}`)
                continue;
            }

            const pset_result = {}
            for (const propID of pset.array) {
                const map = valueMap.get(propID);
                if (!map || map.value == undefined) {
                    const d = {
                        propid: propID,
                        array: pset.array,
                        psetid: psetID
                    }
                    logs.prop.push(d)
                    continue;
                }

                pset_result[ifcToText(map.property)] = map.value
            }
            obj[ifcToText(pset.pset)] = pset_result
        }
        ifcResult.push(obj)
    }

    const t2 = performance.now()
    console.log('completed in:', convertToFloat((t2 - t0) / 1000), 's');

    const checkResult = {}

    for (const item of ifcResult) {
        const nweItem = {
            Entity: item.Entity,
            Guid: ifcGuidToUuid(item.Guid),
            Name: typeof item.Name == 'string' ? ifcToText(item.Name) : item.Name,
            PredefinedType: typeof item.PredefinedType == 'string' ? ifcToText(item.PredefinedType) : item.PredefinedType,
            ObjectType: typeof item.ObjectType == 'string' ? ifcToText(item.ObjectType) : item.ObjectType,
            Tag: typeof item.Tag == 'string' ? ifcToText(item.Tag) : item.Tag,
        }
        const new_bim_entity = JSON.parse(JSON.stringify(mapping[item.Entity]))
        for (const [pset, value] of Object.entries(new_bim_entity)) {
            const psetItem = item[pset]
            if (psetItem) {
                for (const [k, v] of Object.entries(value)) {
                    const v_type = ifcTypes[v.toUpperCase()] || v
                    const p_item = psetItem[k]
                    if (p_item || p_item == 0) {
                        const checkResult = checkIfcType(p_item, v, v_type)
                        value[k] = [checkResult, p_item, v_type]
                        // 解码
                        if (typeof p_item == 'string') {
                            value[k][1] = ifcToText(p_item)
                        }
                    } else {
                        value[k] = [2, p_item, v_type]
                    }
                }

            } else {
                for (const [k, v] of Object.entries(value)) {
                    const v_type = ifcTypes[v.toUpperCase()] || v
                    value[k] = [1, null, v_type]
                }
            }

            nweItem[pset] = value
        }


        if (!checkResult[item.Entity]) {
            checkResult[item.Entity] = [nweItem]
        } else {
            checkResult[item.Entity].push(nweItem)
        }
    }

    const result = {
        metadata: {
            name: file.name,
            version: 3.0
        },
        data: checkResult,
    };

    return result
}


/**
 * Converts the input to a float with the specified number of decimal places or an integer, if possible.
 *
 * @param {*} input - The input value to convert to a float or integer.
 * @param {number} [dp=2] - The number of decimal places to include in the output (default is 2).
 * @returns {number|string|*} - The input value as a float with the specified number of decimal places or an integer, if possible. If the input cannot be converted, the function returns the original input value.
 *
 * @example
 * // Returns 12.346
 * convertToFloat("12.3456", 3);
 */
function convertToFloat(input, dp) {
    const floatValue = parseFloat(input);
    const intValue = parseInt(input);
    if (!dp) {
        dp = 2
    }

    if (isNaN(floatValue) || !Number.isInteger(intValue)) {
        return input;
    } else if (Number.isInteger(floatValue)) {
        return intValue;
    } else {
        return Number(floatValue.toFixed(dp));
    }
}


/**
 * Converts a number in scientific notation to a decimal.
 *
 * @param {string | number} value - The input value to convert.
 * @returns {string | number} The converted value if it was in scientific notation, or the original value if not.
 *
 * @example
 * // returns "123.45"
 * convertScientificToDecimal('1.2345e+2');
 *
 * @example
 * // returns "1.36915"
 * convertScientificToDecimal('1.36915000000007E+00');
 */
function convertScientificToDecimal(value) {
    if (typeof value !== 'string') {
        return value; // return the input if it's not a string
    }

    if (/^([0-9.]+)?([eE][-+]?[0-9]+)$/.test(value)) {
        // if the value is in scientific notation, convert it to a decimal
        return Number.parseFloat(value);
    } else {
        return value; // otherwise return the input unchanged
    }
}

async function readFile(file, processline) {
    return new Promise((resolve, reject) => {
        const CHUNK_SIZE = 1024 * 1024; // 1MB chunk size
        const decoder = new TextDecoder();
        let offset = 0;
        let line = '';

        const readChunk = () => {
            const reader = new FileReader();
            reader.onload = () => {
                const chunk = new Uint8Array(reader.result);
                const chunkStr = decoder.decode(chunk);
                const lines = chunkStr.split('\n');

                // If there is a partial line at the end of the previous chunk, prepend it to the first line in this chunk
                if (line) {
                    lines[0] = line + lines[0];
                    line = '';
                }

                // If the last line in this chunk is not complete, store it for the next chunk
                if (chunkStr[chunkStr.length - 1] !== '\n') {
                    line = lines.pop();
                }

                // Process each line in this chunk
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    processline(line);
                }

                offset += CHUNK_SIZE;
                if (offset < file.size) {
                    readChunk();
                } else {
                    resolve();
                }
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            const chunk = file.slice(offset, offset + CHUNK_SIZE);
            reader.readAsArrayBuffer(chunk);
        };

        readChunk();
    });
}

function ifcToText(encoded) {
    let result = '';
    let i = 0;
    while (i < encoded.length) {
        if (encoded[i] === '\\') {
            if (i + 1 >= encoded.length) {
                result += '\\'; // 无效转义，保留
                break;
            }
            const next = encoded[i + 1];
            if (next === '\\') {
                result += '\\'; // literal \
                i += 2;
                continue;
            } else if (next === 'S' && i + 2 < encoded.length && encoded[i + 2] === '\\') {
                // \S\char: ISO 8859-1 扩展，char code + 128
                const char = encoded[i + 3];
                if (char) {
                    const code = char.charCodeAt(0) + 128;
                    result += String.fromCharCode(code);
                    i += 4; // \S\char
                } else {
                    result += encoded.substr(i, 4); // 无效，保留
                    i += 4;
                }
                continue;
            } else if (next === 'P' && i + 3 < encoded.length && encoded[i + 2] === 'A' && encoded[i + 3] === '\\') {
                // \PA\\S\char: 显式 ISO 8859-1
                if (i + 5 < encoded.length && encoded[i + 4] === 'S' && encoded[i + 5] === '\\') {
                    const char = encoded[i + 6];
                    if (char) {
                        const code = char.charCodeAt(0) + 128;
                        result += String.fromCharCode(code);
                        i += 7; // \PA\\S\char
                    } else {
                        result += encoded.substr(i, 7); // 无效
                        i += 7;
                    }
                } else {
                    result += encoded.substr(i); // 无效
                    break;
                }
                continue;
            } else if (next === 'X' && i + 2 < encoded.length) {
                if (encoded[i + 2] === '\\') {
                    // \X\HH: 8位 hex
                    const hex = encoded.substr(i + 3, 2);
                    if (/^[0-9A-F]{2}$/i.test(hex)) {
                        const code = parseInt(hex, 16);
                        result += String.fromCharCode(code);
                        i += 5; // \X\HH
                    } else {
                        result += encoded.substr(i, 5); // 无效
                        i += 5;
                    }
                } else if (encoded[i + 2] === '2' && encoded[i + 3] === '\\') {
                    // \X2\HHHH...\X0\: 16位 Unicode
                    i += 4; // 跳过 \X2\
                    let hexStr = '';
                    while (i < encoded.length && !encoded.substr(i, 4).match(/^\\X0\\/i)) {
                        const chunk = encoded.substr(i, 4);
                        if (/^[0-9A-F]{4}$/i.test(chunk)) {
                            hexStr += chunk;
                            i += 4;
                        } else {
                            break; // 无效
                        }
                    }
                    if (encoded.substr(i, 4) === '\\X0\\') {
                        i += 4; // 跳过 \X0\
                        for (let j = 0; j < hexStr.length; j += 4) {
                            const high = parseInt(hexStr.substr(j, 4), 16);
                            result += String.fromCharCode(high);
                        }
                    } else {
                        result += '\\X2\\' + hexStr; // 无效，保留
                    }
                } else if (encoded[i + 2] === '4' && encoded[i + 3] === '\\') {
                    // \X4\HHHHHHHH...\X0\: 32位 Unicode
                    i += 4; // 跳过 \X4\
                    let hexStr = '';
                    while (i < encoded.length && !encoded.substr(i, 4).match(/^\\X0\\/i)) {
                        const chunk = encoded.substr(i, 8);
                        if (/^[0-9A-F]{8}$/i.test(chunk)) {
                            hexStr += chunk;
                            i += 8;
                        } else {
                            break; // 无效
                        }
                    }
                    if (encoded.substr(i, 4) === '\\X0\\') {
                        i += 4; // 跳过 \X0\
                        for (let j = 0; j < hexStr.length; j += 8) {
                            const code = parseInt(hexStr.substr(j, 8), 16);
                            if (code <= 0xFFFF) {
                                result += String.fromCharCode(code);
                            } else {
                                // 代理对 for > 0xFFFF
                                const surrogateHigh = Math.floor((code - 0x10000) / 0x400) + 0xD800;
                                const surrogateLow = ((code - 0x10000) % 0x400) + 0xDC00;
                                result += String.fromCharCode(surrogateHigh, surrogateLow);
                            }
                        }
                    } else {
                        result += '\\X4\\' + hexStr; // 无效，保留
                    }
                } else {
                    result += '\\X'; // 无效
                    i += 2;
                }
                continue;
            } else {
                result += '\\' + next; // 其他转义，保留
                i += 2;
                continue;
            }
        } else {
            result += encoded[i];
            i++;
        }
    }
    return result;
}


/**
 * 检查值是否符合指定的 IFC 类型
 * @param {any} value - 需要检查的值
 * @param {string} ifcType - IFC 类型标识符
 * @returns {boolean} 如果值符合指定的 IFC 类型则返回 true，否则返回 false
 * 0 - 合格
 * 1 - 缺参数
 * 2 - 值为空
 * 3 - 值类型不对
 * 4 - 值域不对
 */
function checkIfcType(value, ifcType, ifcTypes) {

    if (ifcTypes === 'string') {
        if (typeof value !== 'string') {
            return 3;
        }
        if (value.length === 0) {
            return 2
        }

        return 0
    }

    if (ifcTypes === 'datetime') {
        if (typeof value !== 'string') {
            return 3;
        }
        if (value.length === 0) {
            return 2
        }
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
            return 4
        }
        return 0
    }

    if (ifcTypes === 'date') {
        if (typeof value !== 'string') {
            return 3;
        }
        if (value.length === 0) {
            return 2
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return 4
        }
        return 0
    }

    if (ifcTypes === 'array') {
        if (typeof value !== 'string') {
            return 3;
        }
        if (value.length === 0) {
            return 2
        }
        // 值域检查
        // const rawValue = ifcToText(value)
        // console.log('rawValue.slice(1,-1)', rawValue.slice(1,-1))
        // if (!Array.isArray(rawValue.slice(1,-1))) {
        //     return 4;
        // }
        return 0
    }

    if (ifcTypes === 'boolean') {
        if (typeof value !== 'boolean') {
            return 3
        }
        return 0
    }

    if (ifcTypes === 'int') {
        if (!Number.isInteger(value)) {
            return 3
        }
        return 0
    }

    if (ifcTypes === 'float') {
        if (typeof value !== 'number' || isNaN(value)) {
            return 3
        }
        if (ifcType === 'IFCPOSITIVELENGTHMEASURE' && value <= 0) {
            return 3
        }
        return 0
    }

    // 如果传入未定义的 IFC 类型，返回 false
    return 3;
}

const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
// const reverse = Object.fromEntries(chars.split("").map((char, index) => [char, index]));
// const ifcGuidRegex = new RegExp(/^[0-3][\dA-Za-z_$]{21}$/);

// function fromIfcGuidArray(ifcGuid){

//   if (typeof ifcGuid !== "string")
//     throw new TypeError("Invalid IFC-GUID type");
//   if (ifcGuid.length !== 22)
//     throw Error("Invalid IFC-GUID length");
//   if (!ifcGuidRegex.test(ifcGuid)) throw Error("Invalid character in IFC-GUID");

//   const result = new Uint8Array(16);
//   result[0] = (reverse[ifcGuid[0]] << 6) | reverse[ifcGuid[1]];

//   for (let i = 2, j = 1; j < 16; i = i + 4, j = j + 3) {
//     const u24 =
//       (reverse[ifcGuid[i]] << 18) |
//       (reverse[ifcGuid[i + 1]] << 12) |
//       (reverse[ifcGuid[i + 2]] << 6) |
//       reverse[ifcGuid[i + 3]];

//     result[j] = (u24 >> 16) & 255;
//     result[j + 1] = (u24 >> 8) & 255;
//     result[j + 2] = u24 & 255;
//   }

//   return result;
// }

function u64(v) {
    return Array.from(v).reduce((a, b) => a * 64 + chars.indexOf(b), 0);
}

function ifcGuidToUuid(ifcGuid) {
    const bs = [u64(ifcGuid.substring(0, 2))];
    for (let i = 0; i < 5; i++) {
        const d = u64(ifcGuid.substring(2 + 4 * i, 6 + 4 * i));
        for (let j = 0; j < 3; j++) {
            bs.push((d >> (8 * (2 - j))) % 256);
        }
    }
    const bsf = bs.map(b => b.toString(16).padStart(2, '0')).join("");
    return `${bsf.slice(0, 8)}-${bsf.slice(8, 12)}-${bsf.slice(12, 16)}-${bsf.slice(16, 20)}-${bsf.slice(20)}`
}




