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
        this.uploadFile(this._fileInput.files[0]);
    };
    UploadPrompt.prototype.uploadFile = function (file) {
        var _this = this;
        this.view.classList.add('is-uploading');
        this.view.classList.add('is-prompting');
        this._fileProcessingStatus.innerHTML = 'Uploading file';
        this._fileInputLabel.setAttribute('for', '');
        var data = new FormData();
        data.append('translation', file);
        fetch(window.location.origin + "/upload", {
            headers: new Headers({
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            }),
            credentials: 'include',
            method: 'POST',
            body: data
        })
            .then(function (request) { return request.json(); })
            .then(function (response) {
            if (response) {
                _this._fileProcessingStatus.innerHTML = 'Processing file';
                _this.convert(response);
            }
        })
            .catch(function (error) {
            console.error(error);
            _this.view.classList.remove('is-uploading');
            _this.view.classList.remove('is-prompting');
            _this._fileProcessingStatus.innerHTML = 'Drop your file to upload';
        });
    };
    UploadPrompt.prototype.convert = function (translations) {
        var _this = this;
        fetch(window.location.origin + "/convert", {
            headers: new Headers({
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }),
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify(translations)
        })
            .then(function (request) { return request.blob(); })
            .then(function (blob) {
            var url = window.URL.createObjectURL(blob);
            var temp = document.createElement('a');
            temp.setAttribute('download', "translations.zip");
            temp.href = url;
            temp.click();
            _this.view.append(temp);
            _this.view.classList.remove('is-uploading');
            _this.view.classList.add('has-file');
            _this._fileProcessingStatus.innerHTML = 'Click to download file';
        })
            .catch(function (error) {
            console.error(error);
        });
    };
    return UploadPrompt;
}());
new UploadPrompt();
//# sourceMappingURL=main.js.map