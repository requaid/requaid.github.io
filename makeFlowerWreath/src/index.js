
// $(".draggable").draggable(); // 오브젝트 드래그 속성



function toggleBgm() {
	var called_frame = parent.document.getElementById("bgm_frame").contentWindow;
	var soundButton = document.getElementById('speaker');

	if (soundButton.classList.contains('soundOff')) {
		called_frame.player.playVideo();
	} else {
		called_frame.player.pauseVideo();
	}
	soundButton.classList.toggle('soundOff');
	if ($('html').hasClass('single')) {
		return false;
	} else {
		return true;
	}
}

function exitNotice() {
	var notice = document.getElementById('notice');
	called_frame.player.playVideo();
	notice.classList.add('disable');
}


// 메뉴 버튼
function toggleMenu() {
	var menuBtn = document.getElementById('menuBtn');
	var selectArea = document.getElementById('selectArea');
	menuBtn.classList.toggle('active');
	selectArea.classList.toggle('disable');
}
// 완성 버튼
function submitBtn() {
	soundCall();
}
function soundCall() {
	var submitSound = new Audio("./src/sound/shining.mp3");
	submitSound.play();
}
