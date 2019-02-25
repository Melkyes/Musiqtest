const Discord = require('discord.js');
const yt = require('ytdl-core');
const config = require('./config.json');
const client = new Discord.Client();
var opus = require('opusscript');
 
let queue = {};
 
client.on('ready', () => {
    console.log('Bob said you are good to go!');
    client.user.setGame("Playing your songs! *help");
});
 
client.on('guildMemberAdd', (member) => {
    let guild = member.guild;
    member.sendMessage("Hi there! This is Bob-Music-Bot. A bot created by Bob. To find all of my commands, use *help.");
});
 
client.on('guildCreate', guild => {
    console.log('New guild added: ${guild.name}, owned by ${guild.owner.user.username}')
 
});
 
client.on('message', message => { // ALL commands should go in here.
 
 
 
 
    if (message.author.bot) return; // Removes the possibility of the bot replying to itself
    if (!message.content.startsWith(config.prefix)) return; // Only lets the bots read messages that start with *
 
 
    let command = message.content.split(' ')[0];
    command = command.slice(config.prefix.length);
    console.log(command); // Logs all Commands
 
    let args = message.content.split(' ').slice(1);
 
 
    if (command === 'help') {
        message.channel.sendMessage('__**Music Commands**__ \n ```' + config.prefix + 'join : Join Voice channel of message sender \n' + config.prefix + 'add : Add a valid youtube link to the queue \n' + config.prefix + 'queue : Shows the current queue, up to 15 songs shown. \n' + config.prefix + 'play : Play the music queue if already joined to a voice channel \n' + '' + 'the following commands only function while the play command is running: \n'.toUpperCase() + config.prefix + 'pause : pauses the music \n' + config.prefix + 'resume : "resumes the music \n' + config.prefix + 'skip : skips the playing song \n' + config.prefix + 'time : Shows the playtime of the song.' + 'volume+(+++) : increases volume by 2%/+' + 'volume-(---) : decreases volume by 2%/- \n' + '```')
    }
 
    if (command === 'play') {
        if (queue[message.guild.id] === undefined) return message.channel.sendMessage(`Add some songs to the queue first with ${config.prefix}add`); //Add some songs if the queue is empty.
        if (!message.guild.voiceConnection) return commands.join(message).then(() => commands.play(message));
        if (queue[message.guild.id].playing) return message.channel.sendMessage('Already Playing');
        let dispatcher;
        queue[message.guild.id].playing = true;
 
        console.log(queue);
        (function play(song) {
            console.log(song);
            if (song === undefined) return message.channel.sendMessage('Queue is empty').then(() => {
                queue[message.guild.id].playing = false;
                message.member.voiceChannel.leave();
            });
            message.channel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);
            dispatcher = message.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes: config.passes });
            let collector = message.channel.createCollector(m => m);
            collector.on('message', m => {
                if (m.content.startsWith(config.prefix + 'pause')) {
                    message.channel.sendMessage('paused').then(() => { dispatcher.pause(); });
                } else if (m.content.startsWith(config.prefix + 'resume')) {
                    message.channel.sendMessage('resumed').then(() => { dispatcher.resume(); });
                } else if (m.content.startsWith(config.prefix + 'skip')) {
                    message.channel.sendMessage('skipped').then(() => { dispatcher.end(); });
                } else if (m.content.startsWith('volume+')) {
                    if (Math.round(dispatcher.volume * 50) >= 100) return message.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume * 50)}%`);
                    dispatcher.setVolume(Math.min((dispatcher.volume * 50 + (2 * (m.content.split('+').length - 1))) / 50, 2));
                    message.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume * 50)}%`);
                } else if (m.content.startsWith('volume-')) {
                    if (Math.round(dispatcher.volume * 50) <= 0) return message.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume * 50)}%`);
                    dispatcher.setVolume(Math.max((dispatcher.volume * 50 - (2 * (m.content.split('-').length - 1))) / 50, 0));
                    message.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume * 50)}%`);
                } else if (m.content.startsWith(config.prefix + 'time')) {
                    message.channel.sendMessage(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000) / 1000) < 10 ? '0' + Math.floor((dispatcher.time % 60000) / 1000) : Math.floor((dispatcher.time % 60000) / 1000)}`);
                }
            });
            dispatcher.on('end', () => {
                collector.stop();
            });
            dispatcher.on('error', (err) => {
                return message.channel.sendMessage('error: ' + err).then(() => {
                    collector.stop();
                    play(queue[message.guild.id].songs.shift());
                });
            });
        })(queue[message.guild.id].songs[0]);
    }
 
    if (command === 'join') {
        return new Promise((resolve, reject) => {
            const voiceChannel = message.member.voiceChannel;
            if (!voiceChannel || voiceChannel.type !== 'voice') return message.reply('I couldn\'t connect to your voice channel...');
            voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
        });
    }
 
    if (command === 'add') {
        let url = message.content.split(' ')[1];
        if (url == '' || url === undefined) return message.channel.sendMessage(`You must add a url, or youtube video id after ${config.prefix}add`);
        yt.getInfo(url, (err, info) => {
            if (err) return message.channel.sendMessage('Invalid YouTube Link: ' + err);
            if (!queue.hasOwnProperty(message.guild.id)) queue[message.guild.id] = {}, queue[message.guild.id].playing = false, queue[message.guild.id].songs = [];
            queue[message.guild.id].songs.push({ url: url, title: info.title, requester: message.author.username });
            message.channel.sendMessage(`added **${info.title}** to the queue`);
        });
    }
 
    if (command === 'queue') {
        if (queue[message.guild.id] === undefined) return message.channel.sendMessage(`Add some songs to the queue first with ${config.prefix}add`);
        let tosend = [];
        queue[message.guild.id].songs.forEach((song, i) => { tosend.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`); });
        message.channel.sendMessage(`__**${message.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0, 15).join('\n')}\`\`\``);
   }
 
   if (command === 'about') {
       message.channel.sendMessage("Made by Bob. With the help of some githubs")
   }
 
 
 
 
 
 
});
 
client.login(config.token);
