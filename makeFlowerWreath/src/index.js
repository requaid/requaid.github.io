window.onload(getBeforeWork());

function getBeforeWork() {
	var printSection = document.getElementById('printSection');
	var preWork = window.localStorage.getItem('makeFlowerWreath');
	if (preWork) {
		printSection.innerHTML = preWork;
	}
	$(".draggable").draggable();
}

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

// 베이스 변경
function changeBaseObj(id) {
	var basicFrame = document.getElementById('basicFrame');
	basicFrame.classList.remove('base_vine', 'base_flower', 'base_branch', 'base_thorn');
	basicFrame.classList.add(id);
	saveCache();
}

// 오브젝트 생성
function getFlowerObj(id, type) {
	var idSeq = window.localStorage.getItem('makeFlowerWreathSeq') ? window.localStorage.getItem('makeFlowerWreathSeq') : 0;
	var objId = 'object' + idSeq;
	var customArea = document.getElementById('customArea');
	var newObj = document.createElement('div');
	var imgSrc = './src/img/' + type + '/' + id + '.png';
	var divSrc = '<img src="' + imgSrc + '">';
	newObj.setAttribute('id', objId);
	newObj.setAttribute('onmouseup', 'saveCache()');
	newObj.classList.add('draggable', 'pointer', type);
	newObj.innerHTML = divSrc;
	customArea.append(newObj);
	$(".draggable").draggable();
	window.localStorage.setItem('makeFlowerWreathSeq', ++idSeq);
}

// 작업물 저장
function saveCache() {
	var printSection = document.getElementById('printSection');
	var work = printSection.innerHTML;
	window.localStorage.setItem('makeFlowerWreath', work);
}

// 완성 버튼
function submitBtn() {
	soundCall();
}

function soundCall() {
	var submitSound = new Audio("./src/sound/shining.mp3");
	submitSound.volume = 0.3;
	submitSound.play();
	// var savesound = new Audio("./src/sound/humming.mp3");
	// savesound.play();
}

// 리셋 버튼
function resetBtn() {
	var objList = document.querySelectorAll('.draggable');
	for (var o of objList) {
		o.remove();
	}
	window.localStorage.setItem('makeFlowerWreathSeq', 0);
	window.localStorage.setItem('makeFlowerWreath', '');
	var resetSound = new Audio("./src/sound/reset.mp3");
	resetSound.play();
}