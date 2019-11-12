module.exports = function(client) {
  // plex commands -------------------------------------------------------------
  var plexCommands = require('../commands/plex.js');
  var keys = require('../config/keys.js');

  // Database for individual server settings as well as saving bot changes. This can be used later for even more advanced customizations like mod roles, log channels, etc.
  const SQLite = require("better-sqlite3");
  const sql = new SQLite('./config/database.sqlite');

  // when bot is ready
  client.on('ready', async message => {
    console.log('bot ready');
    console.log('logged in as: ' + client.user.tag);
    client.user.setActivity('| ' + keys.defaultPrefix, { type: 'LISTENING' });

    // Check if the table "guildSettings" exists.
    const tableGuildSettings = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'guildSettings';").get();
    if (!tableGuildSettings['count(*)']) {
      // If the table isn't there, create it and setup the database correctly.
      sql.prepare("CREATE TABLE guildSettings (id TEXT PRIMARY KEY, guild TEXT, prefix TEXT);").run();
      // Ensure that the "id" row is always unique and indexed.
      sql.prepare("CREATE UNIQUE INDEX idx_guildSettings_id ON guildSettings (id);").run();
      sql.pragma("synchronous = 1");
      sql.pragma("journal_mode = wal");
    }

    // And then we have prepared statements to get and set guildSettings data.
    client.getGuildSettings = sql.prepare("SELECT * FROM guildSettings WHERE guild = ?");
    client.setGuildSettings = sql.prepare("INSERT OR REPLACE INTO guildSettings (id, guild, prefix) VALUES (@id, @guild, @prefix);");


    plexCommands['plexTest'].process();
  });

  // when message is sent to discord
  client.on('message', async message => {
    if (message.author.bot) return;  // If a bot sends a message, ignore it.
    let guildSettings;  // used for discord server settings

    if (message.guild) {
      // Sets default server settings if message occurs in a guild (not a dm)
      guildSettings = client.getGuildSettings.get(message.guild.id);
      if (!guildSettings) {
        guildSettings = { id: `${message.guild.id}-${client.user.id}`, guild: message.guild.id, prefix: keys.defaultPrefix };
        client.setGuildSettings.run(guildSettings);
        guildSettings = client.getGuildSettings.get(message.guild.id);
      }
    }
    var prefix = guildSettings.prefix;

    var msg = message.content.toLowerCase();
    if (msg.startsWith(prefix)){
      // Used for bot settings
      var args = message.content.slice(prefix.length).trim().split(/ +/g);
      var command = args.shift().toLowerCase();

      var cmdTxt = msg.split(" ")[0].substring(prefix.length, msg.length);
      var query = msg.substring(msg.indexOf(' ')+1);
      var cmd = plexCommands[cmdTxt];

      if (command === "bot") {
        // This is where we change bot information
        if (args.length > 0) {
          command = args.shift().toLowerCase();
        } else {
          command = "help";
        }

        if (command === "prefix") {
          if (args.length > 0) {
            if (message.channel.guild.member(message.author).hasPermission('ADMINISTRATOR')) {
              command = args.shift().toLowerCase();
              guildSettings.prefix = command;
              client.setGuildSettings.run(guildSettings);
              guildSettings = client.getGuildSettings.get(message.guild.id);
              message.channel.send("Prefix changed to `" + guildSettings.prefix + "`");
            }
            else {
              return message.channel.send('You do not have permissions to use `' + prefix + 'bot prefix` in <#' + message.channel.id + '>!');
            }
          } else {
            return message.channel.send("The current prefix is `" + guildSettings.prefix + "`\nTo change it type: `" + guildSettings.prefix + "bot prefix <" + keys.defaultPrefix + ">` (where **<" + keys.defaultPrefix + ">** is the prefix)");
          }
        }
        else if (command === "help") {
          // Help message for bot settings goes here
        }
      }
      else if (command === "help") {
        // Help message for available bot commands goes here
      }
      else if (cmd){
        try {
          cmd.process(client, message, query);
        }
        catch (e) {
          console.log(e);
        }
      }
      else {
        message.reply('**Sorry, that\'s not a command.**');
      }
    }
  });
};
