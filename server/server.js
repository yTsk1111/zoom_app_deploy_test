import http from 'http';
import debug from 'debug';
import { appName } from '../config.js';
import { Server } from 'socket.io';

const dbg = debug(`${appName}:http`);

/**
 * Start the HTTP server
 * @param app - Express app to attach to
 * @param {String|number} port - local TCP port to serve from
 */
export async function start(app, port) {
    // Create HTTP server
    const server = http.createServer(app);

    // let the user know when we're serving
    server.on('listening', () => {
        const addr = server.address();
        console.log(addr);
        const bind =
            typeof addr === 'string'
                ? `pipe ${addr}`
                : `http://localhost:${addr.port}`;
        console.log(`Listening on ${bind}`);
        dbg(`Listening on ${bind}`);
    });

    server.on('error', async (error) => {
        if (error?.syscall !== 'listen') throw error;

        const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

        // handle specific listen errors with friendly messages
        switch (error?.code) {
            case 'EACCES':
                throw new Error(`${bind} requires elevated privileges`);
            case 'EADDRINUSE':
                throw new Error(`${bind} is already in use`);
            default:
                throw error;
        }
    });

    let count = 0;
    let CLIENTS = []; // クライアントのリスト

    const io = new Server(server);

    io.on('connection', (socket) => {
        console.log('socket 接続成功');
        const id = Math.floor(Math.random() * 999999999);
        console.log('新しいクライアント： ' + id);
        const client = { id: id, socket: socket };
        CLIENTS.push(client); //クライアントを登録
        socket.send(count); // 現状のカウント情報を送信

        socket.on('message', (message) => {
            console.log('received: %s', message);
            console.log(count);
            if (message === 'kyosyu') {
                count++;
            } else if (message === 'reset') {
                count = 0;
            } else {
                console.log('received undefined message.');
            }
            socket.send(count);
            for (let j = 0; j < CLIENTS.length; j++) {
                //他の接続しているクライアントにメッセージを一斉送信
                const saved_socket = CLIENTS[j]['socket'];
                if (socket !== saved_socket) {
                    saved_socket.send(count);
                }
            }
        });

        socket.on('close', () => {
            console.log('ユーザー：' + id + ' がブラウザを閉じました');
            for (let j = 0; j < CLIENTS.length; j++) {
                const saved_id = CLIENTS[j]['id'];
                if (id !== saved_id) {
                    delete CLIENTS[id];
                }
            }
        });
    });

    // Listen on provided port, on all network interfaces
    return server.listen(port);
}
