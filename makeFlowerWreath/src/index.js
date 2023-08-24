var bgm = new Audio("./src/sound/bgm.mp3");
bgmPlay();
$(".draggable").draggable(); // 오브젝트 드래그 속성

//bgm 재생
function bgmPlay() {
	bgm.loop = true;
	bgm.play();
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
