var bgm = new Audio("./src/sound/bgm.mp3");
var AudioContext;
var audioContext;
bgmPlay();
// window.onload = function () {
// 	navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
// 		AudioContext = window.AudioContext || window.webkitAudioContext;
// 		audioContext = new AudioContext();
// 	}).catch(e => {
// 		console.error(`Audio permissions denied: ${e}`);
// 	});
// }

// $(".draggable").draggable(); // 오브젝트 드래그 속성

//bgm 재생
function bgmPlay() {
	bgm.loop = true;
	bgm.muted = true;
	bgm.oncanplaythrough = bgm.play();
	bgm.muted = false;
}
function toggleBgm() {
	var soundButton = document.getElementById('speaker');
	if (soundButton.classList.contains('soundOff')) {
		bgm.play();
	} else {
		bgm.pause();
	}
	soundButton.classList.toggle('soundOff');
}

// 완성 버튼
function submitButton() {
	soundCall();
}
function soundCall() {
	var submitSound = new Audio("./src/sound/shining.mp3");
	submitSound.play();
}
