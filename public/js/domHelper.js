var domHelper = {

    clickID: (elemID, func) => {
        let elem = document.getElementById(elemID);
        if(elem) {
            elem.addEventListener(`click`, func);
        }
    },

    clickClass: (elemClass, func) => {
        let elems = document.getElementsByClassName(elemClass);
        for(let i = 0 ; i < elems.length; i++) {
            if(elems[i]) {
                elems[i].addEventListener(`click`, func);
            }
        }
    }

}