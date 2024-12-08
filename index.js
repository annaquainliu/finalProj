let interval = null;
let letters = {};
let minAmp = 10;
let minFreq = 1;
let mouth = document.getElementsByClassName("mouth")[0];
let squirrel = document.getElementsByClassName("squirrel")[0];
let eyes = document.getElementsByClassName("eye");
let mediaRecorder = null;
let playAudio = document.getElementById('adioPlay');

function getAmplitude(analyser) {
    const byteData = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(byteData);

    // Calculate the Root Mean Square (RMS) to get the amplitude.
    let sum = 0;
    for (let i = 0; i < byteData.length; i++) {
        sum += byteData[i] * byteData[i];
    }
    const rms = Math.sqrt(sum / byteData.length);
    const amplitude = rms / 128; 
    return amplitude;
}

function getFrequency(analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    let avg = sum / dataArray.length;
    return avg;
}

function randomDirection() {
    return (Math.random() < 0.5 ? -1 : 1) * (Math.random() + 0.5);
}

function offScreen(vw, vh) {
    return vw < 0 || vh < 0 || vw > 100 || vh > 100;
}

function recordAudio() {
    mouth.style.display = "block";
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (mediaStreamObj) {
            mediaRecorder = new MediaRecorder(mediaStreamObj);
            mediaRecorder.start();
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(mediaStreamObj);
            const analyser = audioCtx.createAnalyser();
            source.connect(analyser);
            // Map of letter id to their directions
            let directions = {};

            for (let id in letters) {
                directions[id] = [randomDirection(), randomDirection()];
            }

            interval = setInterval(() => {
                // If the user cleared all of the letters
                if (Object.keys(letters).length == 0) {
                    resetScreen();
                    getAudio();
                    return;
                }
                
                let amplitude = getAmplitude(analyser);
                let frequency = getFrequency(analyser);
                minAmp = Math.min(minAmp, amplitude);

                // There is negligible sound
                if (amplitude == minAmp) {
                    return;
                }
                // Set the amplitude to be the proportion larger
                amplitude /= minAmp;
                amplitude -= 1;
                amplitude *= 120;
                
                // Set frequency to be proportional
                frequency = Math.max((frequency / minFreq), 1);
                frequency = Math.min(10, frequency);

                // Edit mouth and eyes
                mouth.style.scale = Math.min(2, Math.max(0.3, amplitude));
                for (let eye of eyes) {
                    eye.style.scale = Math.min(4, Math.max(1, amplitude));
                }

                // Make the squirrel shake
                squirrel.style.setProperty('transform', `matrix(1, 0, 0, 1, ${amplitude * randomDirection()}, ${amplitude * randomDirection()})`);

                for (let id in letters) {
                    let letter = letters[id];
                    let left = parseFloat(letter.style.left.slice(0, -2));
                    let top = parseFloat(letter.style.top.slice(0, -2));
                    let rotate = parseFloat(letter.style.rotate.slice(0, -3));

                    left += (amplitude * directions[id][0]);
                    top  += (amplitude * directions[id][1]);
                    rotate += (frequency * directions[id][0]);
                    rotate %= 360;

                    letter.style.fontSize = `${frequency}vw`;
                    letter.style.left = `${left}vw`;
                    letter.style.top = `${top}vh`;
                    letter.style.rotate = `${rotate}deg`;

                    if (offScreen(left, top)) {
                        scream.removeChild(letter);
                        delete letters[id];
                    }
                }

            }, 100); // Update amplitude every 100ms
            
        })
        // If any error occurs then handles the error 
        .catch(function (err) {
            console.log(err.name, err.message);
        });
}

window.onload = () => {
    let submitButton = document.getElementById("submit");
    let concernInput = document.getElementById("concerns");
    let main = document.getElementById("main");
    let scream = document.getElementById("scream");
    let back = document.getElementById("back");

    main.style.display = "flex";
    scream.style.display = "none";

    submitButton.addEventListener("click", () => {
        if (concernInput.value == "" || concernInput.value == undefined) {
            alert("You have to complain about something!!");
            return;
        }
        
        main.style.display = "none";
        scream.style.display = "flex";
        
        // Put letters on the screen
        let concernString = concernInput.value;
        // Each letter is 1.2vw
        let startX = (100 - (concernString.length * 1.2)) / 2;
        let startY = ((concernString.length * 1.2) / 100) + 10;
        startX = Math.max(0, startX);

        for (let i = 0; i < concernString.length; i++) {
            let letter = document.createElement('span');
            letter.innerText = concernString[i];
            letter.className = "letter";
            letter.style.top = `${startY}vh`;
            letter.style.left = `${startX}vw`;
            letter.style.rotate = '0deg';
            letter.id = i;
            startX += 1.2;
            if (startX > 100) {
                startX %= 100;
                startY += 5;
            }
            scream.appendChild(letter);
            letters[i] = letter;
        }
        recordAudio();
    });

    back.addEventListener("click", () => {
        main.style.display = "flex";
        scream.style.display = "none";

        resetScreen();

        let playAudioButton = document.getElementById("playAudioButton");
        if (playAudioButton != null) {
            playAudio.src = "";
            document.body.removeChild(playAudioButton);
        }
    });

}

function getAudio() {

    if (mediaRecorder == null) {
        return;
    }

    mediaRecorder.stop();
    // If audio data available then push it to the chunk array
    mediaRecorder.ondataavailable = function (ev) {
        let dataArray = [ev.data];
        // blob of type mp3
        let audioData = new Blob(dataArray, { 'type': 'audio/mp3;' });

        // Creating audio url with reference 
        // of created blob named 'audioData'
        let audioSrc = window.URL.createObjectURL(audioData);
    

        // Create a Play Audio button
        let playAudioButton = document.createElement('button');
        playAudioButton.id = "playAudioButton";
        playAudioButton.innerText = "Play Audio!";
        document.body.appendChild(playAudioButton);
        // Link the audio to the audio tag
        playAudio.src = audioSrc;

        playAudioButton.addEventListener("click", () => {
            // Pass the audio url to the 2nd video tag
            playAudio.play();
        });
    };

    mediaRecorder = null;
}

function resetScreen() {
    minAmp = 10;
    minFreq = 1;

    for (let id in letters) {
        scream.removeChild(letters[id]);
    }
    letters = {};
    mouth.style.display = "none";
    squirrel.style.bottom = '0px';
    squirrel.style.left = '44.5vw';
    for (let eye of eyes) {
        eye.style.scale = 1;
    }

    if (interval == null) {
        return;
    }

    clearInterval(interval);
    interval = null;

}
