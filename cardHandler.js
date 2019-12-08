const mngr = require(`./mngr`);

let Questions = [];
let Answers = [];

exports.init = () => {
    return new Promise((resolve, reject) => {
        try {
            mngr.fs().readFile(`./data/cards.json`, `utf-8`, (err, data) => {
                if(err) {
                    reject(err);
                } else {
                    let json = JSON.parse(data);

                    for(let i = 0; i < json.length; i++) {
                        if(json[i].cardType === `A`) {
                            Answers.push(json[i]);
                        } else if(json[i].cardType === `Q`) {
                            Questions.push(json[i]);
                        }
                    }

                    if(Questions.length > 0 && Answers.length > 0) {
                        resolve();
                    } else {
                        reject({error: "No Questions or Answers"});
                    }
                }
            });
        } catch(err) {
            reject(err);
        }
    });
}


exports.getQuestionsCopy = () => {
    let copy = [];
    for(let i = 0; i < Questions.length; i++) {
        copy.push({text: Questions[i].text});
    }
    return copy;
}

exports.getAnswersCopy = () => {
    let copy = [];
    for(let i = 0; i < Answers.length; i++) {
        copy.push({text: Answers[i].text})
    }
    return copy;
}