import express from 'express';
import axios from 'axios';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import debug from 'debug';
import helmet from 'helmet';
import logger from 'morgan';
import { dirname } from 'path';
import { fileURLToPath, URL } from 'url';
import { WebSocketServer } from 'ws';

import { start } from './server/server.js';
import indexRoutes from './server/routes/index.js';
import authRoutes from './server/routes/auth.js';

import { appName, port, redirectUri } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('app run.');
/* App Config */
const app = express();
const dbg = debug(`${appName}:app`);

const redirectHost = new URL(redirectUri).host;

// views and assets
const staticDir = `${__dirname}/dist`;
const viewDir = `${__dirname}/server/views`;

app.set('view engine', 'pug');
app.set('views', viewDir);
app.locals.basedir = staticDir;

// static contents
app.use('/public', express.static(__dirname + '/public'));

// HTTP
app.set('port', port);

// log Axios requests and responses
const logFunc = (r) => {
    if (process.env.NODE_ENV !== 'production') {
        let { method, status, url, baseURL, config } = r;

        const endp = url || config?.url;
        const base = baseURL || config?.baseURL;
        let str = new URL(endp, base).href;

        if (method) str = `${method.toUpperCase()} ${str}`;
        if (status) str = `${status} ${str}`;

        debug(`${appName}:axios`)(str);
    }

    return r;
};

axios.interceptors.request.use(logFunc);
axios.interceptors.response.use(logFunc);

/*  Middleware */
const bootstrap =
    'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css';
const headers = {
    frameguard: {
        action: 'sameorigin',
    },
    hsts: {
        maxAge: 31536000,
    },
    referrerPolicy: 'same-origin',
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            'default-src': 'self',
            styleSrc: ["'self'", bootstrap],
            scriptSrc: ["'self'", 'https://appssdk.zoom.us/sdk.min.js'],
            imgSrc: ["'self'", `https://${redirectHost}`],
            'connect-src': ["'self'", 'ws://localhost:3007'],
            'base-uri': 'self',
            // 'form-action': 'self',
        },
    },
};

app.use(helmet(headers));

app.use(express.json());
app.use(compression());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev', { stream: { write: (msg) => dbg(msg) } }));

// serve our app folder
app.use(express.static(staticDir));

/* Routing */
app.use('/', indexRoutes);
app.use('/auth', authRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const title = `Error ${err.status}`;

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    if (res.locals.error) dbg(`${title} %s`, err.stack);

    // render the error page
    res.status(status);
    res.render('error');
});

const wss = new WebSocketServer({ port: 3007 });

let count = 0;
let CLIENTS = []; // クライアントのリスト
let id;
wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    console.log('新しいクライアント： ' + id);
    id = Math.floor(Math.random() * 999999999);
    const client = { id: id, ws: ws };
    CLIENTS.push(client); //クライアントを登録
    ws.send(count); // 新規クライアントに現状のカウント情報を送信

    ws.on('message', function message(data) {
        console.log('received: %s', data);
        if (data == 'kyosyu') {
            count++;
        } else if (data == 'reset') {
            count = 0;
        } else {
            console.log('received undefined message.');
        }
        ws.send(count); // 自身にカウントを送信
        for (let j = 0; j < CLIENTS.length; j++) {
            //他の接続しているクライアントにカウントを一斉送信
            const saved_ws = CLIENTS[j]['ws'];
            if (ws !== saved_ws) {
                saved_ws.send(count);
            }
        }
    });
    ws.on('close', function () {
        console.log('ユーザー：' + id + ' がブラウザを閉じました');
        for (let j = 0; j < CLIENTS.length; j++) {
            const saved_id = CLIENTS[j]['id'];
            if (id !== saved_id) {
                delete CLIENTS[id];
            }
        }
    });
});

// redirect users to the home page if they get a 404 route
app.get('*', (req, res) => res.redirect('/'));

// start serving
start(app, port).catch(async (e) => {
    console.error(e);
    process.exit(1);
});

export default app;
