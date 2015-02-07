(function () {
    'use strict';
    var songs = [];

    document.querySelector('input').addEventListener('change', function () {
        songs = [];
        start(this.value);
    });

    var fadeOut = function (src, target, time, step) {
        var then = Date.now();
        var x = function () {
            var now = Date.now();
            if (now <= then + time) {

                if (src.volume > target && src.volume > step) {
                    console.log(src.volume);
                    src.volume -= step;
                } else {
                    src.pause();
                    clearInterval(interval);
                }
            } else {
                src.pause();
                clearInterval(interval);
            }
        };
        var interval = setInterval(x, (((src.volume - target) / step) / time) * 10000);
    };

    var fadeIn = function (src, target, time, step) {
        src.volume = 0;
        src.play();
        var then = Date.now();
        var x = function () {
            var now = Date.now();
            if (now <= then + time) {

                if (src.volume < target && src.volume < 0.9) {
                    src.volume += step;
                } else {
                    clearInterval(interval);
                }
            } else {
                clearInterval(interval);
            }
        };
        var interval = setInterval(x, (((src.volume - target) / step) / time) * 10000);
    };

    var start = function (term) {
        $.get('https://api.spotify.com/v1/search?q=' + term + '&type=track', function (data) {
            console.log(data);
            for (var i = 0; i < data.tracks.items.length; i++) {
                var track = data.tracks.items[i];

                var audio = document.createElement('audio');
                audio.src = track.preview_url;
                audio.volume = 1;
                audio.setAttribute('data-name', track.name);
                songs.push(audio);
            }

            var time = 0;

            var play = function (i) {
                setTimeout(function () {
                    if (songs[i-1]) {
                        fadeOut(songs[i-1], 0, 250, 0.1);
                        //  songs[i-1].pause();
                    }
                    var name = songs[i].getAttribute('data-name');
                    console.log(name);
                    fadeIn(songs[i], 1, 250, 0.1);
                    // songs[i].play();
                }, time += 2000);
            };

            for (var i = 0; i < songs.length; i++) {
                play(i);
            }
        });
    };

    $.get('https://accounts.spotify.com/authorize', function (data) {
        console.log(data);
    });
})();
