
$(document).ready(function() {
	console.log('run this')
	console.log(Window.location);
	/* Global io*/
	let socket = io();

	socket.on('connect_error', err => {
		console.log(`connect_error due to ${err.message}`);
	});


	socket.on('user', data => {
		console.log(data);

		$('#num-users').text(data.currentUsers + ' users online');
		let message =
			data.name +
			(data.connected ? ' has joined the chat.' : ' has left the chat.');
		$('#messages').append($('<li>').html('<b>' + message + '</b>'));
	});

	socket.on('chat message', data => {
		$('#messages').append($('<li>').html(`${data.name}: ${data.message}`));
	})

	// Form submittion with new message in field with id 'm'
	$('form').submit(function() {
		var messageToSend = $('#m').val();

		socket.emit('chat message', messageToSend);
		
		$('#m').val('');
		return false; // prevent form submit from refreshing page
	});
});
