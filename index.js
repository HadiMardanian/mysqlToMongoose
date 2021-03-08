import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import inquirer from 'inquirer';
import CLI from 'clui';
import { Sequelize } from 'sequelize';
import checkboxPlus from 'inquirer-checkbox-plus-prompt';
import selectline from 'inquirer-select-line';
import fuzzypath from 'inquirer-fuzzy-path';
import convert from './convert.js';
inquirer.registerPrompt('checkbox-plus', checkboxPlus);
inquirer.registerPrompt('select-line', selectline);
inquirer.registerPrompt('fuzzypath', fuzzypath);

clear();
console.log(
    chalk.green(
        figlet.textSync('mysql => mongoose', { horizontalLayout: 'full' })
    )
)
//hillz_search_engine_db
let username;
let password;
let sequelize;
let errors;
let dbName;
let dbs;
let dirPath;
const questions = [
    {
        name: 'username',
        type: 'input',
        message: 'Enter mysql admin username: ',
        validate: value => {
            if (value.length) {
                return true;
            } else {
                return 'Please enter mysql admin username: ';
            }
        }
    },
    {
        name: 'password',
        type: 'password',
        message: 'Enter mysql admin password: ',
        validate: value => {
            if (value.length) {
                return true;
            } else {
                return 'Please enter mysql admin password: ';
            }
        }
    }
];
inquirer.prompt(questions)

    .then(async (answers) => {
        password = answers.password;
        username = answers.username;
        let loading = new CLI.Spinner('Connecting...');
        sequelize = new Sequelize('information_schema', username, password, {
            host: 'localhost',
            dialect: 'mysql',
            logging: false
        });

        try {
            loading.start();
            await sequelize.authenticate();
            loading.stop();
            console.log(chalk.black.bgGreen('Connected to mysql'));
                [dbs] = await sequelize.query(`SELECT TABLE_SCHEMA
                                       FROM information_schema.tables
                                       group by tables.TABLE_SCHEMA;`);
            
            dbs = dbs.map(item => item.TABLE_SCHEMA);
            
            let selectedDB = await inquirer.prompt([
                {
                    message: 'Choose one of these databases: ',
                    type: 'list',
                    name: 'dbName',
                    choices: dbs
                }
            ]);
            dbName = selectedDB.dbName;
            loading = new CLI.Spinner(`Connecting to ${dbName}...`);
            sequelize = new Sequelize(dbName, username, password, {
                host: 'localhost',
                dialect: 'mysql',
                logging: false
            });
            loading.start();
            await sequelize.authenticate();
            loading.stop();
            let [tables] = await sequelize.query('show tables');
            tables = tables.map(item => item[`Tables_in_${dbName}`].toLowerCase());
            tables.unshift(chalk.black.bgGreen('all tables'));
            let {path} = await inquirer.prompt({
                type: 'fuzzypath',
                name: 'path',
                excludeFilter: nodePath => nodePath == '.',
                itemType: 'directory',
                rootPath: '.',
                depthLimit: 0,
                message: 'Select a target directory for save models: ',
            });
            dirPath = path;
            let {tables: _tables} = await inquirer.prompt([
                {
                    type: 'checkbox-plus',
                    name: 'tables',
                    message: 'Choose tables ( for search write a letter )',
                    pageSize: 10,
                    highlight: true,
                    loop: false,
                    searchable: true,
                    source: function (answered, input) {
                        let reg = new RegExp(input);
                        let filtered = tables.filter(item => reg.test(item));
                        return new Promise((resolve, reject) => {
                            resolve(filtered);
                        })
                    }
                }
            ]);
            
            let isALlSelected = false;
            let selected = _tables;
            
            if (_tables.includes('all tables')) {
                isALlSelected = true;
            }
            if (isALlSelected) {
                selected = _tables.filter(item => item != 'all tables');
            }
            let converting = new CLI.Spinner('Converting...');
            converting.start();
            for (let item of selected) {
                await convert(item, sequelize, dirPath);
            }
            converting.stop();
            console.log(chalk.black.bgGreen('All done!'));
            process.exit();
        } catch (ex) {
            loading.stop();
            console.log(chalk.black.bgRed('Could not connect to mysql'));
            errors = ex;
            let answer = await inquirer.prompt({
                name: 'answer',
                type: 'input',
                message: 'Do you want to see errors? (y/n)',
                validate: value => {
                    if (value.length) {
                        return true;
                    } else {
                        return 'enter y for YES ans n for NO';
                    }
                }
            })
            if (answer.answer == 'y') {
                console.log(errors);
                errors = '';
            }
        }



    });



