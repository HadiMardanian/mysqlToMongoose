
import dataTypes from './dataTypes.js';
import defaults from './defaults.js';
import fs from 'fs';
export default async function convert(tableName, sequelize, dirPath){
    let [res] = await sequelize.query(`SELECT DATA_TYPE, COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS 
                                     where table_schema = "hillz_search_engine_db" and table_name = "users";`);
    
    let content = '';
    tableName = tableName.split('');
    if(tableName[tableName.length - 1] == 's'){
        tableName.pop();
    }
    tableName = tableName.join('').toString();
    let schemaName = `${tableName}Schema`;
    content += `import mongoose from 'mongoose';\nconst ${schemaName} = new mongoose.Schema({\n\t`;
    for(let i = 0; i < res.length; i++){
        let item = res[i];
        let type = dataTypes[item.DATA_TYPE.toLowerCase()];
        content += `\t${item.COLUMN_NAME}: {type: ${type}`;
        content+=',';
        if(item.IS_NULLABLE == 'YES'){
            let defaultValue = defaults[type];
            content += `default: ${defaultValue == 0 ? 0 : ''}`;
        }else{
            content += 'required: true';
        }
        if(i == res.length - 1){
            content += '}\n';
        }else{
            content += '},\n\t';
        }
    }
    content += `}, {\n\ttimestamps:{\n\t\tcreatedAt: true\n\t}\n});\nexport default mongoose.model("${tableName}", ${schemaName});`;
    fs.writeFileSync(`./${dirPath}/${tableName}.js`, content);
}