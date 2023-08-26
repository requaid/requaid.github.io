
// 브금 온오프
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

// 공지제거
function exitNotice() {
	var notice = document.getElementById('notice');
	called_frame.player.playVideo();
	notice.classList.add('disable');
}


// 메뉴 버튼
function toggleMenu() {
	var menu = document.getElementById('menu');
	var selectArea = document.getElementById('selectArea');
	menu.classList.toggle('active');
	selectArea.classList.toggle('disable');
}

// 메뉴 전환
function selectMenu(target) {
	var ulList = document.querySelectorAll('#flowerPicker ul');
	var targetMenu = document.getElementById(target);
	for (var i of ulList) {
		if (!i.classList.contains('disable')) {
			i.classList.toggle('disable')
		}
	}
	if (targetMenu.classList.contains('disable')) {
		targetMenu.classList.remove('disable');
	}
}

// 오브젝트 생성
function getFlowerObj(id) {
	var customArea = document.getElementById('customArea');
	var newObj = document.createElement('div');
	var imgSrc = './src/img/flower/' + id + '.png';
	var divSrc = '<img src="' + imgSrc + '">';
	newObj.classList.add('flower');
	newObj.classList.add('draggable');
	newObj.classList.add('pointer');
	newObj.innerHTML = divSrc;
	customArea.append(newObj);
	$(".draggable").draggable();
}

// 완성 버튼
function submitBtn() {
	soundCall();
}
function soundCall() {
	var submitSound = new Audio("./src/sound/shining.mp3");
	submitSound.play();
}
