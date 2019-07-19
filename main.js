const fs = require('fs');
const archiver = require('archiver');
const uuid = require('uuid/v4');
const rimraf = require('rimraf');

var UploadPrompt = /** @class */ (function () {
    function UploadPrompt() {
        this.handleFileUpload = this.change.bind(this);
        this.handleDragEnter = this.dragEnter.bind(this);
        this.handleDragLeave = this.dragLeave.bind(this);
        this.handleDrop = this.drop.bind(this);
        this.view = document.body.querySelector('upload-prompt');
        this._fileInput = this.view.querySelector('input#fileInput');
        this._fileInputLabel = this.view.querySelector('label');
        this._fileProcessingStatus = this.view.querySelector('status');
        this.init();
    }
    UploadPrompt.prototype.init = function () {
        this._fileInput.addEventListener('change', this.handleFileUpload);
        this._fileInputLabel.addEventListener('dragenter', this.handleDragEnter);
        this._fileInputLabel.addEventListener('dragleave', this.handleDragLeave);
        this._fileInputLabel.addEventListener('dragover', function (e) { e.preventDefault(); });
        this._fileInputLabel.addEventListener('drop', this.handleDrop);
    };
    UploadPrompt.prototype.drop = function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (this.view.classList.contains('is-uploading') || this.view.classList.contains('has-file')) {
            return;
        }
        if (e.dataTransfer.files.length) {
            console.log(e.dataTransfer.files[0]);
            this.uploadFile(e.dataTransfer.files[0]);
        }
    };
    UploadPrompt.prototype.dragEnter = function () {
        this.view.classList.add('is-prompting');
    };
    UploadPrompt.prototype.dragLeave = function () {
        this.view.classList.remove('is-prompting');
    };
    UploadPrompt.prototype.change = function () {
        if (this.view.classList.contains('is-uploading') || this.view.classList.contains('has-file')) {
            return;
        }
        if (!this._fileInput.files.length) {
            return;
        }
        console.log(this._fileInput.files[0]);
        this.uploadFile(this._fileInput.files[0]);
    };
    UploadPrompt.prototype.uploadFile = function (file) {
        var _this = this;
        this.view.classList.add('is-uploading');
        this.view.classList.add('is-prompting');
        this._fileProcessingStatus.innerHTML = 'Uploading file';
        this._fileInputLabel.setAttribute('for', '');
        this.parseFile(file)
            .then(json => this.convert(json))
            .catch(error => {
                console.error(error);
        });
    };
    UploadPrompt.prototype.convert = function (json) {
        var _this = this;
        let conversionPath = null;
        this.converter(json)
            .then((directoryPath) => {
            conversionPath = directoryPath;
            var temp = document.createElement('a');
            temp.setAttribute('download', "translations.zip");
            temp.href = directoryPath;
            temp.click();
            _this.view.append(temp);
            _this.view.classList.remove('is-uploading');
            _this.view.classList.add('has-file');
            _this._fileProcessingStatus.innerHTML = 'Click to download file';
        })
            .catch(error => {
            console.error(error);
        })
            .then(() => {
            if (fs.existsSync(conversionPath)) {
                rimraf(conversionPath, (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            if (fs.existsSync(`${conversionPath}.zip`)) {
                fs.unlink(`${conversionPath}.zip`, (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        });
    };
    UploadPrompt.prototype.zipFiles = function(path, id) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    await fs.promises.access(path);
                    const output = fs.createWriteStream(`temp/${id}.zip`);
                    const archive = archiver('zip', { zlib: { level: 9 } });
                    output.on('close', () => {
                        resolve();
                    });
                    archive.pipe(output);
                    archive.directory(path, 'translations');
                    archive.finalize();
                }
                catch (error) {
                    reject(error);
                }
            })();
        });
    }
    UploadPrompt.prototype.generateFiles = function(directoryPath, json) {
        return new Promise((resolve, reject) => {
            const locals = Object.keys(json);
            for (let i = 0; i < locals.length; i++) {
                (async () => {
                    try {
                        const path = `${directoryPath}/${locals[i]}`;
                        await fs.promises.access(path);
                        await this.createPhpFile(path, json[locals[i]]);
                        await this.createJsonFile(path, json[locals[i]]);
                        await resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                })();
            }
        });
    }
    UploadPrompt.prototype.createJsonFile = function(directory, json) {
        return new Promise((resolve, reject) => {
            const translations = Object.entries(json);
            let count = 0;
            let file = '{\n';
            for (const [key, value] of translations) {
                count++;
                const cleanKey = key.replace(/\\"/g, '"');
                const cleanValue = value.replace(/\\"/g, '"');
                file += `\t${JSON.stringify(cleanKey)}: ${JSON.stringify(cleanValue)}`;
                if (count < translations.length) {
                    file += ',\n';
                }
                else {
                    file += '\n';
                }
            }
            file += '}\n';
            fs.writeFile(`${directory}/site.json`, file, (err) => {
                if (err) {
                    reject(`Failed to create ${directory}/site.json`);
                }
                resolve();
            });
        });
    }
    UploadPrompt.prototype.createPhpFile = function(directory, json) {
        return new Promise((resolve, reject) => {
            const translations = Object.entries(json);
            let count = 0;
            let file = '<?php\n\n';
            file += 'return [\n';
            for (const [key, value] of translations) {
                count++;
                file += '\t';
                const cleanKey = key.replace(/\\"/g, '"');
                const cleanValue = value.replace(/\\"/g, '"');
                if (cleanKey.match(/\'/g)) {
                    file += `"${cleanKey}"`;
                }
                else {
                    file += `'${cleanKey}'`;
                }
                file += ' => ';
                if (cleanValue.match(/\'/g)) {
                    file += `"${cleanValue}"`;
                }
                else {
                    file += `'${cleanValue}'`;
                }
                if (count < translations.length) {
                    file += ',\n';
                }
                else {
                    file += '\n';
                }
            }
            file += '];\n';
            fs.writeFile(`${directory}/site.php`, file, (err) => {
                if (err) {
                    reject(`Failed to create ${directory}/site.php`);
                }
                resolve();
            });
        });
    }
    
    UploadPrompt.prototype.createLocals = function(baseDirectoryPath, json) {
        return new Promise((resolve) => {
            const keys = Object.keys(json);
            const localsCreated = [];
            for (let i = 0; i < keys.length; i++) {
                fs.mkdir(`${baseDirectoryPath}/${keys[i]}`, (err) => {
                    if (err) {
                        console.log(`Failed to create directory for ${keys[i]}`);
                    }
                    localsCreated.push(keys[i]);
                    if (keys.length === localsCreated.length) {
                        resolve();
                    }
                });
            }
        });
    }
    UploadPrompt.prototype.createTempDirectory = function(filename) {
        return new Promise((resolve, reject) => {
            fs.mkdir(`temp/${filename}`, (err) => {
                if (err) {
                    reject('Failed to generate temp directory');
                }
                resolve(`temp/${filename}`);
            });
        });
    }
    UploadPrompt.prototype.converter = function(json) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    const id = uuid();
                    const directoryPath = await this.createTempDirectory(id);
                    await this.createLocals(directoryPath, json);
                    await this.generateFiles(directoryPath, json);
                    await this.zipFiles(directoryPath, id);
                    await resolve(directoryPath);
                }
                catch (err) {
                    reject(err);
                }
            })();
        });
    }
    UploadPrompt.prototype.parseFile = function (file) {
        return new Promise((resolve, reject) => {
            switch (file.type) {
                case 'text/csv':
                    this.convertCSVtoJSON(file.path)
                        .then(json => resolve(json))
                        .catch(e => reject(e));
                    break;
                case 'application/json':
                    fs.readFile(file.path, (err, file) => {
                        if (err) {
                            reject('Failed to open JSON file.');
                        }
                        resolve(JSON.parse(file));
                    });
                    break;
                default:
                    reject('Invalid file type. Upload a CSV or JSON file.');
                    break;
            }
        });
    }
    UploadPrompt.prototype.convertCSVtoJSON = function(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, file) => {
                if (err) {
                    reject('Failed to open CSV file.');
                }
                const json = {};
                const csv = file.toString();
                const rows = csv.split(/\n/g);
                const locals = rows[0].split(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/g);
                for (let i = 0; i < locals.length; i++) {
                    let cleanName = locals[i].replace(/^[\"]/, '');
                    cleanName = cleanName.replace(/[\"]$/, '');
                    cleanName = cleanName.replace(/\"\"/g, '\\"');
                    locals[i] = cleanName;
                    json[cleanName] = {};
                }
                if (rows) {
                    for (let i = 1; i < rows.length; i++) {
                        const values = rows[i].split(/,(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/g);
                        if (values) {
                            if (values.length === locals.length) {
                                for (let k = 0; k < locals.length; k++) {
                                    let cleanName = values[k];
                                    if (values[k].length) {
                                        cleanName = cleanName.replace(/^[\"]/, '');
                                        cleanName = cleanName.replace(/[\"]$/, '');
                                        cleanName = cleanName.replace(/\"\"/g, '\\"');
                                        values[k] = cleanName;
                                    }
                                    json[locals[k]][values[0]] = cleanName;
                                }
                            }
                        }
                        else {
                            reject('Failed to parse CSV values.');
                        }
                    }
                    resolve(json);
                }
                else {
                    reject('Failed to parse CSV rows.');
                }
            });
        });
    }
    return UploadPrompt;
}());
new UploadPrompt();
//# sourceMappingURL=main.js.map