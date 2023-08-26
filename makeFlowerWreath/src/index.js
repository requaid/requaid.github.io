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
}

// 완성 버튼
function submitBtn() {
	soundCall();
}
function soundCall() {
	var submitSound = new Audio("./src/sound/shining.mp3");
	submitSound.play();
}


// 오브젝트 이동
function MouseDown(event) {
	event.preventDefault();

	const el = event.flower;
	const classList = el.classList;

	if (!classList.contains("hold")) {
		const mouseX = event.clientX;
		const mouseY = event.clientY;

		const targetPos = el.getBoundingClientRect();
		const targetX = targetPos.x;
		const targetY = targetPos.y;

		/*타겟의 left, top이 그저 마우스의 좌표로 이동하게 된다면 어떻게 될지 상상해보라.*/
		const gapX = mouseX - targetX;
		const gapY = mouseY - targetY;

		el.setAttribute("gap-x", gapX);
		el.setAttribute("gap-y", gapY);

		/*수많은 target 중 클릭의 타겟이 된 하나의 target에 hold 클라스 부여함*/
		classList.add("hold");
	}
}

function MouseMove(event) {
	event.preventDefault();

	const el = document.querySelector(".flower.hold");
	if (el) {
		const mouseX = event.clientX;
		const mouseY = event.clientY;

		const gapX = el.getAttribute("gap-x");
		const gapY = el.getAttribute("gap-y");

		const targetX = mouseX - gapX;
		const targetY = mouseY - gapY;

		el.style.left = targetX + "px";
		el.style.top = targetY + "px";
	}
}

function MouseUp(event) {
	event.preventDefault();

	const el = document.querySelector(".flower.hold");
	el.removeAttribute("gap-x");
	el.removeAttribute("gap-y");
	el.classList.remove("hold");
}

$(document).ready(function () {
	const targets = document.querySelectorAll(".flower");

	targets.forEach(function (target, idx) {
		target.addEventListener('mousedown', MouseDown);
	});

	document.addEventListener('mousemove', MouseMove);
	document.addEventListener('mouseup', MouseUp);

});