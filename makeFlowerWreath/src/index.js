window.onload(getBeforeWork());
ribbonList();

function ribbonList() {
	var ribbonSection = document.getElementById('ribbon');
	var x = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
	var y = ['1', '2', '3', '4', '5', '6', '7'];
	for (var i of x) {
		for (var j of y) {
			var newObj = document.createElement('li');
			var objIdNo = i + j;
			var ribbonFn = "getFlowerObj('" + objIdNo + "', 'ribbon')";
			var imgSrc = '<img src ="./src/img/ribbon/' + objIdNo + '.png" />';
			newObj.setAttribute('onclick', ribbonFn);
			newObj.innerHTML = imgSrc;
			ribbonSection.append(newObj);
		}
	}
}
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
	notice.classList.toggle('active');
	notice.classList.toggle('disable');
	called_frame.player.playVideo();
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
	html2canvas(document.querySelector("#printSection"), { backgroundColor: null }).then(canvas => {
		saveImg(canvas.toDataURL('image/jpg'), '화관 만들기.png');
	});
	var submitSound = new Audio("./src/sound/humming.mp3");
	submitSound.play();
}

const saveImg = (uri, filename) => {
	let link = document.createElement('a');
	document.body.appendChild(link);

	link.href = uri;
	link.download = filename;
	link.click();

	document.body.removeChild(link);
};


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