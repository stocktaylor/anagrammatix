class vc {
    constructor(vcCnfg) {
        this.topLeftStack = [];
        this.topRightStack = [];


        //init Listener functions
        this.topLeftButton = document.getElementById(`topLeft`);
        this.topRightButton = document.getElementById(`topRight`);
        this.vcCanvas = document.getElementById(`screenSpace`);
        this.vcCanvas.style.display = `block`;

        this.vcDisp = document.getElementById(`realEstate`);
    }


    setTopLeft(callback, label) {
        return new Promise((resolve, reject) => {
            if((typeof callback === `function`) && (typeof label === `string`)) {
                this.topLeftStack.push({
                    function: this.topLeftCallback,
                    label: this.topLeftLabel
                });
    
                if(typeof this.topLeftCallback === `function`){
                    this.topLeftButton.removeEventListener(`click`, this.topLeftCallback);
                }
                
                this.topLeftCallback = callback;
                this.topLeftButton.addEventListener(`click`, this.topLeftCallback);
                this.topLeftLabel = label;
                this.topLeftButton.innerHTML = this.topLeftLabel;
                resolve();
            } else {
                reject({message: `callback must be a function and label must be a string`});
            }
        });
    }

    revertTopLeft() {
        return new Promise((reject, resolve) => {{
            alert(`stub for menu bar button revert.  ToDo: Implement`);
            console.log(`vc.js, func revertTopLeft`);
            resolve();
        }});
    }


}