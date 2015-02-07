(function () {
    'use strict';

    //const KEY = 'XXXXXX';

    var getSpotifyArtists = function (artists) {
        return new Promise(function (resolve, reject) {
            var spotifyArtists = [];

            for (var i = 0; i < artists.length; i++) {
                var artist = artists[i];
                $.get('https://api.spotify.com/v1/search?type=artist&q=' + artist, function (res) {
                    spotifyArtists.push(res.artists.items[0]);
                    if (spotifyArtists.length === artists.length) {
                        resolve(spotifyArtists);
                    }
                });
            }
        });
    };

    var getTopTracks = function (artists) {
        return new Promise(function (resolve, reject) {
            for (var i = 0; i < artists.length; i++) {
                (function (i) {
                    $.get('https://api.spotify.com/v1/artists/' + artists[i].id + '/top-tracks?country=GB', function (d) {
                        artists[i].tracks = d.tracks;
                        if (i === artists.length - 1) {
                            resolve(artists);
                        }
                    });
                })(i);
            }
        });
    };

    $.get('https://developer.echonest.com/api/v4/artist/top_hottt?api_key=' + 'XXXXXX' + '&format=json&results=50&start=0&bucket=id:spotify', function (data) {
        var artists = [];

        for (var i = 0; i < data.response.artists.length; i++) {
            var artist = data.response.artists[i];
            artists.push(artist.name);
        }

        getSpotifyArtists(artists).then(getTopTracks).then(quiz.start);
    });
})();

var quiz = (function () {
    'use strict';

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    var artists,
        questionsAnswered = 0,
        songs = [];

    var getRandomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    var shuffle = function (o) {
        for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i),
            x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };

    var generateQuestion = function () {
        //determine which question to show
        var random = Math.random(),
            type;

        if (random <= 1/3) {
            type = 'album';
        } else if (random > 1/3 && random <= 1-(1/3)) {
            type = 'song';
        } else {
            type = 'track';
        }

        var artist = artists[getRandomInt(0, artists.length - 1)];
        var text;

        switch (type) {
            case 'album':
                text = 'Which of these albums is by {artist}?'
                    .replace('{artist}', artist.name);
            break;
            case 'song':
                text = 'Which of these songs is by {artist}?'
                    .replace('{artist}', artist.name);
            break;
            case 'track':
                text = 'Which of these tracks is by {artist}?'
                .replace('{artist}', artist.name);
            break;
        }

        var options = [];

        options.push(artist);
        for (var i = 0; i < 3; i++) {
            options.push(artists[getRandomInt(0, artists.length - 1)]);
        }

        options = shuffle(options);

        var question = {
            text: text,
            options: options,
            answer: artist,
            type: type
        };

        return question;
    };

    var createPlaylist = function (user) {

        if (!songs.length) {
            return;
        }

        var json = JSON.stringify({name: 'Quiz'});
        var token = getParameterByName('access_token');

        $.ajax({
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            data: json,
            dataType: 'json',
            url: 'https://api.spotify.com/v1/users/' + user.id + '/playlists',
            type: 'POST',
            success: function (playlist) {
                $.ajax({
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    type: 'POST',
                    data: JSON.stringify( songs ),
                    url: 'https://api.spotify.com/v1/users/' + user.id + '/playlists/' + playlist.id + '/tracks',
                    success: function () {
                        document.querySelector('#quiz').innerHTML = '<p><strong>Quiz complete!</strong> A <a href="' + playlist.external_urls.spotify + '" target="_blank">Spotify playlist</a> with your wrong choices has been created.</p>';
                        document.querySelector('#quiz').innerHTML += '<p>You got ' + (10 - songs.length) + '/10.</p>';
                    },
                    error: function () {
                        console.log(arguments);
                    }
                });
            },
            error: function (data) {
                console.log(arguments);
            }
        });
    };

    var stateMachine = function () {
        return {
            question: {},
            templates: function () {
                var html = '<h2>Question ' + (questionsAnswered + 1) + '</h2>';
                switch (this.question.type) {
                    case 'album':
                        html += '<p>' + this.question.text + '</p>';
                        for (var i = 0; i < this.question.options.length; i++) {
                            var x = this.question.options[i];
                            html += '<img class="answer album" data-uri="'+x.tracks[0].uri+'" src=' + x.tracks[0].album.images[1].url + '>';
                        }
                    break;
                    case 'track':
                        html += '<p>' + this.question.text + '</p>';
                        for (var i = 0; i < this.question.options.length; i++) {
                            var x = this.question.options[i];
                            html += '<audio src=' + x.tracks[0].preview_url + ' preload controls></audio>';
                            html += '<label><input class="answer" data-uri="'+x.tracks[0].uri+'" type="radio" name="answer"> Choose this track</label>';
                        }
                    break;
                    case 'song':
                        html += '<p>' + this.question.text + '</p>';
                        html += '<ul class="numbered-list">';
                        for (var i = 0; i < this.question.options.length; i++) {
                            var x = this.question.options[i];
                            html += '<li class="answer" data-uri="'+x.tracks[0].uri+'">' + x.tracks[0].name + '</li>';
                        }
                        html += '</ul>';
                    break;
                }

                return html;
            },
            bindEvents: function () {
                var self = this;
                $('.answer').on('click', function () {
                    if (this.getAttribute('data-uri') === self.question.answer.tracks[0].uri) {
                        console.log('right');
                    } else {
                        console.log('wrong');
                        songs.push(this.getAttribute('data-uri'));
                    }

                    self.update();
                });
            },
            update: function () {
                if (questionsAnswered < 10) {
                    this.question = generateQuestion();
                    var html = this.templates();
                    document.querySelector('#quiz').innerHTML = html;
                    this.bindEvents();
                    questionsAnswered++;
                } else {
                    $.ajax({
                        url: 'https://api.spotify.com/v1/me',
                        headers: {
                            'Authorization': 'Bearer ' + getParameterByName('access_token'),
                            'Content-Type': 'application/json'
                        },
                        success: createPlaylist
                    });
                }
            }
        };
    };

    var start = function (a) {
        if (!a) throw new Error('No artists passed');
        artists = a;
        stateMachine().update();
    };

    return {
        start: start
    };
})();
