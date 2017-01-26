var showdown = require('showdown');
var converter = new showdown.Converter();
window.jQuery = window.$ = require('jquery');
var ipc = require('electron').ipcRenderer;
var input = $($('textarea')[0]);
var output = $('#output');
var currentFile = null;
var currentTXT = null;
var savedTXT = '';
var notSaved = $('#notSaved');
var confirmed;
var giveParents = require('give-parents');
var velocity = require('velocity-animate');
var msgBox = $('#msgBox');
input.focus();

function showMSG(obj, hideDelay) {
	if (!hideDelay) hideDelay = 1500;
	var borderHeight = 6;
	var paddingHeight = 20;
	var height;
	var prom = msgBox.html(obj.txt).promise();
	prom.done(function() {
		height = msgBox.height() + paddingHeight + borderHeight;
		msgBox.css({
			'border-color': obj.color,
			color: obj.color,
			top: (height * -1) + 'px'
		});
		msgBox.velocity({
			translateY: (height) + 20 + 'px',
			opacity: 1,
		}, {
			delay: 0,
			duration: 550,
			easing: [0.75, 0.01, 0.62, 1.35],
			loop: false,
			begin: function() {},
			progress: function(elements, percent) {},
			complete: function() {
				msgBox.velocity({
					translateY: '-100px',
					opacity: 0,
				}, {
					delay: hideDelay,
					duration: 550,
					easing: [0, -0.85, 0.57, 1],
					loop: false,
					begin: function() {},
					progress: function(elements, percent) {},
					complete: function() {
						msgBox.attr('style', '');
					}
				});
			}
		});
	});
}

function showOuput() {
	var inputTXT = input.val();
	if (inputTXT != savedTXT) notSaved.addClass('active');
	else notSaved.removeClass('active');
	output.html(converter.makeHtml(inputTXT));
}
input.on('change keyup paste', showOuput);
var ipcR = {
	save: { in: function(args) {
			currentTXT = input.val();
			this.out(currentTXT);
		},
		out: function(txt) {
			this.parent.send('save', txt);
		},
		complete: function() {
			savedTXT = currentTXT;
			notSaved.removeClass('active');
			showMSG({
				color: '#0ff114',
				txt: 'save succesful'
			});
		}
	},
	new: {
		in: function() {
			this.parent.send('new', {
				saved: !notSaved.hasClass('active')
			});
		},
		out: function() {

		},
		complete: function() {

		}
	},
	open: {
		in: function() {
			this.parent.send('open', {
				saved: !notSaved.hasClass('active')
			});
		},
		complete: function(obj) {
			if (obj.success) {
				currentFile = obj.file;
				savedTXT = obj.content;
				input.val(savedTXT);
				setTimeout(function() {
					showOuput();
				}, 0);
			} else {
				this.parent.send('new', {
					dir: obj.dir
				});
			}
		}
	},
	send: function(cmd, args) {
		ipc.send('ipcR', {
			cmd: cmd,
			args: args
		});
	},
	ingest: function(event, arg) {
		var that = this;
		ipc.on('ipcM', function(event, arg) {
			if (that[arg.cmd]) that[arg.cmd].in(arg.args);
			else if (that[arg.complete]) that[arg.complete].complete(arg.args);
		});
	},
	init: function() {
		var that = this;
		giveParents(ipcR, function() {
			that.ingest();
		});
	}
};
ipcR.init();

window.onbeforeunload = function() {
	if (notSaved.hasClass('active')) {
		var confirmed = confirm("You have unsaved work.\n\nWould you like to exit anyway?");
		if (confirmed) {
			return undefined;
		} else return false;
	}
};
