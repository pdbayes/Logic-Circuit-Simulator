const { app, BrowserWindow, Menu, MenuItem, shell } = require('electron')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600
    })

    win.loadFile('index.html')
}

app.setName("Logic")
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    // if (process.platform !== 'darwin') 
    app.quit()
})

const menu = Menu.buildFromTemplate(menuTemplate())
Menu.setApplicationMenu(menu)


function menuTemplate() {

    const galleryListener = (item/*: MenuItem*/) => {
        console.dir("loading example " + item.label)
    }

    const template = [
        {
            label: 'Edit',
            submenu: [{
                role: 'undo'
            }, {
                role: 'redo'
            }, {
                type: 'separator'
            }, {
                role: 'cut'
            }, {
                role: 'copy'
            }, {
                role: 'paste'
            }, {
                role: 'selectall'
            }]
        },
        {
            label: 'View',
            submenu: [{
                role: 'reload'
            }, {
                role: 'toggledevtools'
            }, {
                type: 'separator'
            }, {
                role: 'resetzoom'
            }, {
                role: 'zoomin'
            }, {
                role: 'zoomout'
            }, {
                type: 'separator'
            }, {
                role: 'togglefullscreen'
            }]
        },
        {
            label: 'Gallery',
            submenu: [{
                label: 'SevenSegment',
                click: galleryListener
            }]
        },
        {
            role: 'window',
            submenu: [{
                label: 'Minimize',
                accelerator: 'CmdOrCtrl+M',
                role: 'minimize'
            }]
        },
        {
            role: 'help',
            submenu: [{
                label: 'Learn More',
                click: function () { shell.openExternal('http://electron.atom.io') }
            }]
        },
    ];

    if (process.platform === 'darwin') {
        const { name } = app;
        template.unshift({
            label: name,
            submenu: [
                {
                    role: 'about'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Services',
                    role: 'services',
                    submenu: []
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Hide ' + name,
                    accelerator: 'Command+H',
                    role: 'hide'
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Command+Shift+H',
                    role: 'hideothers'
                },
                {
                    label: 'Show All',
                    role: 'unhide'
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: function () { app.quit(); }
                },
            ]
        });
        const windowMenu = template.find(function (m) { return m.role === 'window' })
        if (windowMenu) {
            windowMenu.submenu.push(
                {
                    type: 'separator'
                },
                {
                    label: 'Bring All to Front',
                    role: 'front'
                }
            );
        }
    }

    return template;
}