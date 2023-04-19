console.log('送信ボタンを押して下さい');
let sock = new WebSocket('wss://deploy-test-ze7k.onrender.com');

sock.addEventListener('open', function (e) {
    // 接続
    console.log('Socket 接続成功');
});

sock.addEventListener('message', function (e) {
    // サーバーからデータを受け取る
    let count = e.data;
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
