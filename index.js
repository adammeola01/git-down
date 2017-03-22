//TODO: fork dialogues into child process
//TODO: Write abstraction for menu's, the API is hideous .
//TODO: test windows and linux
const {
	app,
	BrowserWindow,
	Menu,
	protocol,
	ipcMain,
	dialog
} = require('electron');
const fs = require('fs');
var currentFile = null;
var GUItxt = null;
const giveParents = require('give-parents');
const ipc = ipcMain;
const showdown = require('showdown');
const converter = new showdown.Converter();
function locationExists(t){try{return stats=fs.lstatSync(t),!0}catch(t){return!1}}
var ipcM = {
	exportHTML:{
		in: function(args){
			var that = this;
			function writeFile() {
				mainWindow.setTitle(currentFile);
				var html = fs.readFileSync('./exportAssets/1.html', "utf8");
				html += fs.readFileSync('./exportAssets/github.css', "utf8");
				html += fs.readFileSync('./exportAssets/2.html', "utf8");
				html+= '\n';
				html += args;
				html+= '\n';
				html += fs.readFileSync('./exportAssets/3.html', "utf8");
				fs.writeFile(currentFile.split('').reverse().join('').replace('dm.', 'lmth.').split('').reverse().join(''), html, function(err) {
					mainWindow.webContents.send('saved', '');
					that.parent.send({
						complete: 'exportHTML',
						args: ''
					});
				});
			}
			if (!currentFile) {
				dialog.showOpenDialog({
					properties: ['openDirectory']
				}, function(files) {
					if (files) {
						currentFile = files[0] + '/README.md';
						writeFile();
					}
				});
			} else {
				writeFile();
			}

			// fs.writeFile('/Users/Adam/Downloads/foo.html', html, function(err) {
			//
			// });
		},
		out: function(){
			console.log('got it');
			this.parent.send({
				cmd: 'exportHTML',
				args: ''
			});
		},
		complete: function(){

		}
	},
	save: { in: function(txt) {
			var that = this;
			function writeFile() {
				mainWindow.setTitle(currentFile);
				fs.writeFile(currentFile, txt, function(err) {
					mainWindow.webContents.send('saved', '');
					that.parent.send({
						complete: 'save',
						args: ''
					});
				});
			}
			if (!currentFile) {
				dialog.showOpenDialog({
					properties: ['openDirectory']
				}, function(files) {
					if (files) {
						currentFile = files[0] + '/README.md';
						writeFile();
					}
				});
			} else {
				writeFile();
			}
		},
		out: function() {
			var that = this;
			this.parent.send({
				cmd: 'save',
				args: ''
			});
		}
	},
	open: {
		out: function() {
			this.parent.send({
				cmd: 'open',
				args: ''
			});
		},
		in: function(arg) {
			var that = this;
			function openProject() {
				dialog.showOpenDialog({
					properties: ['openFile', 'openDirectory']
				}, function(files) {
					if (files) {
						var stat = fs.statSync(files[0]);
						var dir = '';
						if (stat && stat.isDirectory()) {
							dir = files[0];
						} else {
							dir = files[0].split('/');
							dir.pop();
							dir = dir.join('/');
						}
						if (locationExists(dir + '/README.md')) {
							currentFile = dir + '/README.md';
							txt = fs.readFileSync(currentFile, "utf8");
							mainWindow.setTitle(currentFile);
							that.parent.send({
								complete: 'open',
								args: {
									success: true,
									file: dir + '/README.md',
									content: txt
								}
							});
						} else {
							that.parent.send({
								complete: 'open',
								args: {
									success: false,
									dir: dir
								}
							});
						}
					}
				});
			}
			if (!arg.saved) {
				dialog.showMessageBox({
					message: "You have unsaved work\n\nWould you like to open a project anyway",
					buttons: ["Yes", "No"]
				}, function() {
					if (!arguments[0]) openProject();
				});
			} else {
				openProject();
			}
		}
	},
	new: {
		in: function(arg) {
			var that = this;
			function saveNewProject() {
				dialog.showOpenDialog({
					properties: ['openDirectory']
				}, function(files) {
					if (files) {
						currentFile = files[0] + '/README.md';
						if(locationExists(currentFile)){
							dialog.showMessageBox({
								message: currentFile+" already exists."
							}, function() {
								if (!arguments[0]) saveNewProject();
							});
						}
						else{
							fs.writeFile(currentFile, '', function(err) {
								that.parent.send({
									complete: 'open',
									args: {
										success: true,
										file: currentFile,
										content: ''
									}
								});
								mainWindow.setTitle(currentFile);
							});
						}
					}
				});
			}
			if (!arg.saved) {
				dialog.showMessageBox({
					message: "You have unsaved work\n\nWould you like to create a new README.md anyway",
					buttons: ["Yes", "No"]
				}, function() {
					if (!arguments[0]) saveNewProject();
				});
			} else {
				saveNewProject();
			}
		},
		out: function() {
			this.parent.send({
				cmd: 'new',
				args: ''
			});
		},
		complete: function() {

		}
	},
	send: function(obj) {
		if (obj.cmd) {
			mainWindow.webContents.send('ipcM', {
				cmd: obj.cmd,
				args: obj.args
			});
		} else if (obj.complete) {
			mainWindow.webContents.send('ipcM', {
				complete: obj.complete,
				args: obj.args
			});
		}
	},
	ingest: function(event, arg) {
		var that = this;
		ipc.on('ipcR', function(event, arg) {
			if (that[arg.cmd]) that[arg.cmd].in(arg.args);
		});
	},
	init: function() {
		var that = this;
		giveParents(ipcM, function() {
			that.ingest();
		});
	}
};
ipcM.init();
let mainWindow;
function createWindow() {
	mainWindow = new BrowserWindow({
		title: "Git Down!"
	});
	mainWindow.loadURL(`file://${__dirname}/index.html`);
	mainWindow.on('closed', function() {
		mainWindow = null;
	});
	mainWindow.webContents.openDevTools();
}
let template = [{
	label: 'File',
	submenu: [{
		label: 'Open README.md',
		accelerator: "CmdOrCtrl+O",
		click: function() {
			ipcM.open.out();
		}
    }, {
		label: 'New README.md',
		accelerator: "CmdOrCtrl+N",
		click: function() {
			ipcM.new.out();
		}
    }, {
		label: 'Save README.md',
		accelerator: "CmdOrCtrl+S",
		click: function() {
			ipcM.save.out();
		}
    },
	{
		label: 'Export README.html',
		accelerator: "CmdOrCtrl+E",
		click: function() {
			ipcM.exportHTML.out();
		}
	}]
}, {
	label: "Edit ",
	submenu: [{
		label: "Undo",
		accelerator: "CmdOrCtrl+Z",
		selector: "undo:"
    }, {
		label: "Redo",
		accelerator: "Shift+CmdOrCtrl+Z",
		selector: "redo:"
    }, {
		type: "separator"
    }, {
		label: "Cut",
		accelerator: "CmdOrCtrl+X",
		selector: "cut:"
    }, {
		label: "Copy",
		accelerator: "CmdOrCtrl+C",
		selector: "copy:"
    }, {
		label: "Paste",
		accelerator: "CmdOrCtrl+V",
		selector: "paste:"
    }, {
		label: "Select All",
		accelerator: "CmdOrCtrl+A",
		selector: "selectAll:"
    }]
}];

function addUpdateMenuItems(items, position) {
	if (process.mas) return;
	const version = app.getVersion();
	items.splice.apply(items, [position, 0]);
}

function findReopenMenuItem() {
	const menu = Menu.getApplicationMenu();
	if (!menu) return;
	let reopenMenuItem;
	menu.items.forEach(function(item) {
		if (item.submenu) {
			item.submenu.items.forEach(function(item) {
				if (item.key === 'reopenMenuItem') {
					reopenMenuItem = item;
				}
			});
		}
	});
	return reopenMenuItem;
}
if (process.platform === 'darwin') {
	const name = app.getName();
	template.unshift({
		label: name,
		submenu: [{
			label: `Close`,
			accelerator: 'Command+W',
			role: 'close'
        },
		{
			label: `Minimize`,
			accelerator: 'Command+M',
			role: 'minimize'
        }, {
			label: `Hide`,
			accelerator: 'Command+H',
			role: 'hide'
        }, {
			label: 'Hide Others',
			accelerator: 'Command+Alt+H',
			role: 'hideothers'
        }, {
			label: 'Quit',
			accelerator: 'Command+Q',
			click: function() {
				app.quit();
			}
        }]
	});
	addUpdateMenuItems(template[0].submenu, 1);
}

app.on('ready', function() {
	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
	createWindow();
});
app.on('activate', function() {
	let reopenMenuItem = findReopenMenuItem();
	if (reopenMenuItem) reopenMenuItem.enabled = false;
	if (mainWindow === null) {
		createWindow();
	}
});
app.on('window-all-closed', function() {
	let reopenMenuItem = findReopenMenuItem();
	if (reopenMenuItem) reopenMenuItem.enabled = true;
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
