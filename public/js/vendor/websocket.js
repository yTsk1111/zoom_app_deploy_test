console.log('送信ボタンを押して下さい');
import { io } from 'https://cdn.socket.io/4.4.1/socket.io.esm.min.js';
let sock = io();

sock.addEventListener('open', function (e) {
    // 接続
    console.log('Socket 接続成功');
});

sock.on('message', function (data) {
    // サーバーからデータを受け取る
    let count = data;
    let elm = document.getElementById('counter');
    let updated = '挙手数：' + count;
    if (count == 0) {
        document.getElementById('kyosyu_image').style.display = 'none';
    } else if (count > 0) {
        document.getElementById('kyosyu_image').style.display = 'inline';
    }
    elm.textContent = updated;
});

document.addEventListener('DOMContentLoaded', function (e) {
    document.getElementById('kyosyu').addEventListener('click', function (e) {
        sock.send('kyosyu');
    });
});

document.addEventListener('DOMContentLoaded', function (e) {
    document
        .getElementById('reset_kyosyu')
        .addEventListener('click', function (e) {
            sock.send('reset');
        });
});
