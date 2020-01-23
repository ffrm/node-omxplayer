'use strict';

// ----- Requires ----- //

let spawn = require('child_process').spawn;
let EventEmitter = require('events');


// ----- Setup ----- //

// The permitted audio outputs, local means via the 3.5mm jack.
let ALLOWED_OUTPUTS = ['hdmi', 'local', 'both', 'alsa'];

let ALLOWED_ASPECT_MODES = ['stretch', 'letterbox', 'fill'];

let ALLOWED_ALIGNMENTS = ['left', 'center'];

// ----- Functions ----- //

// Creates an array of arguments to pass to omxplayer.
function buildArgs(source, {
	output,
	loop,
	volume,
	showOsd,
	win,
	aspectMode,
	subtitles,
	align,
	fontSize,
	ghostBox,
} = {}) {
	let out = '';

	if (output) {

		if (ALLOWED_OUTPUTS.indexOf(output) === -1) {
			throw new Error(`Output ${output} not allowed.`);
		}

		out = output;

	} else {
		out = 'local';
	}

	let osd = false;
	if (showOsd) {
		osd = showOsd;
	}

	let args = [source, '-o', out, osd ? '' : '--no-osd'];

	// Handle the loop argument, if provided
	if (loop) {
		args.push('--loop');
	}

	// Handle the initial volume argument, if provided
	if (Number.isInteger(volume)) {
		args.push('--vol', volume);
	}

	// Handle custom window position/size, if provided
	if (typeof win === 'string' && /^(\d{1,}\,){3}\d{1,}$/.test(win)) {
		args.push('--win', win);
	}

	// Handle video aspect mode, if provided
	if (aspectMode) {
		if (ALLOWED_ASPECT_MODES.indexOf(aspectMode) === -1) {
			throw new Error(`Aspect mode ${aspectMode} not allowed.`);
		}
		args.push('--aspect-mode', aspectMode);
	}

	// Handle subtitle text align, if provided
	if (align) {
		if (ALLOWED_ALIGNMENTS.indexOf(align) === -1) {
			throw new Error(`Subtitle alignment ${align} not allowed.`);
		}
		args.push('--align', align);
	}

	// Add subtitle path, if provided
	if (subtitles) {
		args.push('--subtitles', subtitles);
	}

	// Set custom subtitle font size, if provided
	if (Number.isInteger(fontSize)) {
		args.push('--font-size', fontSize);
	}

	// Enable or disable subtitle ghost box, if provided
	if (typeof ghostBox === 'boolean' && ghostBox === false) {
		args.push('--no-ghost-box');
	}

	return args;
}


// ----- Omx Class ----- //
function Omx(source, {
	output,
	loop,
	volume,
	showOsd,
	win,
	aspectMode,
	subtitles,
	align,
	fontSize,
	ghostBox,
} = {}) {

	// ----- Local Vars ----- //

	let omxplayer = new EventEmitter();
	let player = null;
	let open = false;

	// ----- Local Functions ----- //

	// Marks player as closed.
	function updateStatus() {

		open = false;
		omxplayer.emit('close');

	}

	// Emits an error event, with a given message.
	function emitError(message) {

		open = false;
		omxplayer.emit('error', message);

	}

	// Spawns the omxplayer process.
	function spawnPlayer(src, {
		output,
		loop,
		volume,
		showOsd,
		win,
		aspectMode,
		subtitles,
		align,
		fontSize,
		ghostBox
	} = {}) {

		let args = buildArgs(src, {
			output,
			loop,
			volume,
			showOsd,
			win,
			aspectMode,
			subtitles,
			align,
			fontSize,
			ghostBox
		});
		console.log('args for omxplayer:', args);
		let omxProcess = spawn('omxplayer', args);
		open = true;

		omxProcess.stdin.setEncoding('utf-8');
		omxProcess.on('close', updateStatus);

		omxProcess.on('error', () => {
			emitError('Problem running omxplayer, is it installed?.');
		});

		return omxProcess;

	}

	// Simulates keypress to provide control.
	function writeStdin(value) {

		if (open) {
			player.stdin.write(value);
		} else {
			throw new Error('Player is closed.');
		}

	}

	// ----- Setup ----- //

	if (source) {
		player = spawnPlayer(source, {
			output,
			loop,
			volume,
			showOsd,
			win,
			aspectMode,
			subtitles,
			align,
			fontSize,
			ghostBox
		});
	}

	// ----- Methods ----- //

	// Restarts omxplayer with a new source.
	omxplayer.newSource = (src, {
		output,
		loop,
		volume,
		showOsd,
		win,
		aspectMode,
		subtitles,
		align,
		fontSize,
		ghostBox
	}) => {

		if (open) {

			player.on('close', () => {
				player = spawnPlayer(src, {
					output,
					loop,
					volume,
					showOsd,
					win,
					aspectMode,
					subtitles,
					align,
					fontSize,
					ghostBox
				});
			});
			player.removeListener('close', updateStatus);
			writeStdin('q');

		} else {

			player = spawnPlayer(src, {
				output,
				loop,
				volume,
				showOsd,
				win,
				aspectMode,
				subtitles,
				align,
				fontSize,
				ghostBox
			});

		}

	};

	omxplayer.play = () => {
		writeStdin('p');
	};
	omxplayer.pause = () => {
		writeStdin('p');
	};
	omxplayer.volUp = () => {
		writeStdin('+');
	};
	omxplayer.volDown = () => {
		writeStdin('-');
	};
	omxplayer.fastFwd = () => {
		writeStdin('>');
	};
	omxplayer.rewind = () => {
		writeStdin('<');
	};
	omxplayer.fwd30 = () => {
		writeStdin('\u001b[C');
	};
	omxplayer.back30 = () => {
		writeStdin('\u001b[D');
	};
	omxplayer.fwd600 = () => {
		writeStdin('\u001b[A');
	};
	omxplayer.back600 = () => {
		writeStdin('\u001b[B');
	};
	omxplayer.quit = () => {
		writeStdin('q');
	};
	omxplayer.subtitles = () => {
		writeStdin('s');
	};
	omxplayer.info = () => {
		writeStdin('z');
	};
	omxplayer.incSpeed = () => {
		writeStdin('1');
	};
	omxplayer.decSpeed = () => {
		writeStdin('2');
	};
	omxplayer.prevChapter = () => {
		writeStdin('i');
	};
	omxplayer.nextChapter = () => {
		writeStdin('o');
	};
	omxplayer.prevAudio = () => {
		writeStdin('j');
	};
	omxplayer.nextAudio = () => {
		writeStdin('k');
	};
	omxplayer.prevSubtitle = () => {
		writeStdin('n');
	};
	omxplayer.nextSubtitle = () => {
		writeStdin('m');
	};
	omxplayer.decSubDelay = () => {
		writeStdin('d');
	};
	omxplayer.incSubDelay = () => {
		writeStdin('f');
	};

	Object.defineProperty(omxplayer, 'running', {
		get: () => {
			return open;
		}
	});

	// ----- Handle unhandled process ending ----- //

	// Immediately closes the spawned player process before exit.
	const forceQuit = () => {
		omxplayer.quit();
		if (player) player.kill()
	};

	const exit = () => process.exit();

	process
		.on('exit', forceQuit)
		.on('SIGINT', exit)
		.on('SIGUSR1', exit)
		.on('SIGUSR2', exit)
		.on('uncaughtException', exit);

	// ----- Return Object ----- //

	return omxplayer;

}


// ----- Module Exports ----- //

module.exports = Omx;