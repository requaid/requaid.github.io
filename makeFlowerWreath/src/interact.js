const position = { x: 0, y: 0 }

interact('.draggable').draggable({
	listeners: {
		start(event) {
			console.log(event.type, event.target)
		},
		move(event) {
			position.x += event.dx
			position.y += event.dy

			event.target.style.transform =
				`translate(${position.x}px, ${position.y}px)`
		},
	}
})

// lock the drag to the starting direction
interact(singleAxisTarget).draggable({
	startAxis: 'xy'
  lockAxis: 'start'
});

// only drag if the drag was started horizontally
interact(horizontalTarget).draggable({
	startAxis: 'x'
  lockAxis: 'x'
});