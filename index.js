const { EmbedBuilder,Events,Collection,ActionRowBuilder, ButtonBuilder, ButtonStyle,Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences] });
const { token ,mention,channel} = require('./config.json');
const https = require("node:https")
const cheerio = require('cheerio');
const path = require('node:path');
const fs = require('node:fs');

let oldFeed = [];
let oldCommentFeed = [];

const Youtube = new ButtonBuilder().setLabel('Youtube').setStyle(ButtonStyle.Link).setURL('https://www.youtube.com/@MinecraftBedrockArabic');
const Donate = new ButtonBuilder().setLabel('Donate').setStyle(ButtonStyle.Link).setURL('https://paypal.me/mbarabic');
const row = new ActionRowBuilder().addComponents(Youtube,Donate);

client.once('ready', readyClient => {
  console.log('Ready! Logged in as: ' + readyClient.user.username);
  try {
    main();
  } catch (error) {
    
  }
});

function main(){
    //get feed
    const req = https.get("https://modbay.org", res => {
      res.on("error", (err) => {
        if(err.message == "socket hang up") setTimeout(() => main(), 10000)
        else errorFun(err, 26)
        req.end()
        return
      });
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        req.end()
        const html = cheerio.load(data);
        
        //get posts
        const articles = []
        html('article').each((index, element) => {
          const link = html(element).find('.post-card__title a').attr('href')
          if(link){
              const creatorLink = html(element).find('.post-card__name-link').attr('href')
              const temp = creatorLink.split("/")
              const creatorTag = temp[temp.length - 2]
              const article = {
              creatorName: html(element).find('.post-card__name').text().trim(),
              creatorTag: creatorTag,
              profilePic: html(element).find('.post-card__avatar').attr('src'),
              creatorLink: creatorLink,
              title: html(element).find('.post-card__title a').text().trim().replace(/\s\s+/g, ' '),
              type: html(element).find('.tags__item').text().trim(),
              description: html(element).find('.post-card__descr').text().trim().replace(/\s\s+/g, ' '),
              cover: html(element).find('img.lozad').attr('src'),
              link: link,
              views: html(element).find('.post-card__stat-item.f_a .post-card__stat-item-text').text().trim().replace(' ',''),
              comments: html(element).find('.post-card__stat-item:nth-child(2) .post-card__stat-item-text').text().trim(),
              likes: html(element).find('.post-card__stat-item.pc_like .post-card__stat-item-text').text().trim(),
            };
            articles.push(article);
          }
        });
  
        //check new posts
        const newFeed = articles.map(article=>{return article.link})
        if(oldFeed.length == 0) oldFeed = newFeed
        if(JSON.stringify(newFeed) != JSON.stringify(oldFeed)){
          articles.forEach(article => {
            if(!oldFeed.includes(article.link)){
              const status = `<:Picture6:1228685677189791827> + ${article.likes}・<:Picture8:1228685749033893979> ${article.comments}・<:Picture7:1228685721787957263> ${article.views}`;
              const embed = new EmbedBuilder()
                      .setColor("DarkPurple")
                      .setAuthor({name:article.creatorName??null,url:article.creatorLink??null,iconURL:`https://modbay.org${article.profilePic??"/favicon.ico"}`})
                      .setTitle(article.title??null)
                      .setDescription(`\`\`\`${article.description}\`\`\`\n${status}`)
                      .setURL(article.link??null)
                      .setImage(article.cover?`https://modbay.org${article.cover}`:'https://media.discordapp.net/attachments/1225706378673520690/1237346538121068579/Untitled.png')
                      .setFooter({ text: 'ModBay',iconURL:"https://modbay.org/favicon.ico"});
    
              //get subscribers and send message
              fs.access(`./subscribes/posts/${article.creatorTag}.json`, async (error) => {
                  const json = error?{subscribers:[]}:JSON.parse(fs.readFileSync(`./subscribes/posts/${article.creatorTag}.json`))
                  json.subscribers.forEach(subscriber => {
                    client.users.fetch(subscriber).then(async user => {
                      await user.send({ embeds: [embed], components: [row]});
                    })
                  })
              }); 
            }
          })
          oldFeed = newFeed
        }
        
        //get comments
        const comments = [];
        html('.sidebar-widget.sidebar-widget--default').last().find(".sidebar-widget__row.sidebar-widget__row--bottom").find('.sidebar-widget__item').each((index, element) => {
          const cnt = html(element).find('.sidebar-widget__item-row.sidebar-widget__item-row--middle') 
          const comment = {
            commenter: html(element).find('.sidebar-widget__name').text().trim(),
            commenterTag: html(element).find('a').attr('href').split('/')[4],
            commenterPic:html(element).find(".sidebar-widget__avatar").attr('src').replace('.svg','.png'),
            commentLink: cnt.find(".sidebar-widget__text").attr('href'),
            comment: cnt.text().trim(),
          }
          comments.push(comment);
        });
  
        //check new comments
        const newCommentFeed = comments.map(comment=>{return comment.commentLink})
        if(oldCommentFeed.length == 0) oldCommentFeed = newCommentFeed
          comments.forEach(comment => {
            if(!oldCommentFeed.includes(comment.commentLink)){
              const req = https.get(comment.commentLink, (res) => {
                res.on("error", (err) => {
                  if(err.message == "socket hang up") setTimeout(() => main(), 10000)
                  else errorFun(err, 112)
                  req.end()
                  return
                });
                let data = '';
                res.on('data', (chunk) => {data += chunk;});
                res.on('end', () => {
                  req.end()
                  const html = cheerio.load(data);
                  const post = {
                    creator : html('.article__name-link').attr('href')?.split('/')[4],
                    title: html("title").text().trim(),
                    cover: html('meta[property="og:image"]').attr('content'),
                    url: html('meta[property="og:url"]').attr('content'),
                    description: html('meta[property="og:description"]').attr('content'),
                    profilePic: html('.article__avatar').attr('src').replace('.svg','.png'),
                  }
                  if(post.creator == comment.commenterTag) return;
  
                  const pst = new EmbedBuilder()
                        .setColor("DarkPurple")
                        .setAuthor({name:post.creator??null,iconURL:'https://modbay.org' + post.profilePic??null,url:`https://modbay.org/user${post.creator}`})
                        .setTitle(post.title??null)
                        .setURL(post.url??null)
                        .setImage(post.cover??null)
                        .setFooter({ text: 'ModBay',iconURL:"https://modbay.org/favicon.ico"});
                  const cnt = new EmbedBuilder()
                        .setColor("DarkPurple")
                        .setAuthor({name:comment.commenter??null,iconURL:`https://modbay.org${comment.commenterPic??"/favicon.ico"}`,url:`https://modbay.org/user${comment.commenterTag}`})
                        .setDescription(`\`\`\`${comment.comment}\`\`\``)
                        .setFooter({ text: 'New Comment!!',iconURL:"https://media.discordapp.net/attachments/1225706378673520690/1230264069215490070/ndozdv59jsx21.png"});
                  const cntLink = new ButtonBuilder().setLabel('Open Comment').setStyle(ButtonStyle.Link).setURL(comment.commentLink??null);
                  const tmpRow = new ActionRowBuilder().addComponents(cntLink,Youtube,Donate);
  
                  //get subscribers and send message
                  fs.access(`./subscribes/comments/${post.creator}.json`, async (error) => {
                      const json = error?{subscribers:[]}:JSON.parse(fs.readFileSync(`./subscribes/comments/${post.creator}.json`))
                      json.subscribers.forEach(subscriber => {
                        client.users.fetch(subscriber).then(async user => {
                          await user.send({ embeds: [pst,cnt], components: [tmpRow]});
                        })
                      })
                  });
                });
              })
           }
           oldCommentFeed.push(comment.commentLink)
           if(oldCommentFeed.length > 60) oldCommentFeed.shift();
          })
      })
    })
    setInterval(async () => {
      main();
    }, 1000*60*5);
}

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
    errorFun(error, 206)
	}
});

function errorFun(err,line) {
  const embed = new EmbedBuilder()
          .setColor("DarkRed")
          .setTitle("Error: " + err.name + `\nLine: ${line}`)
          .setDescription(err.message)

  if(err.stack) embed.addFields({name:"Stack:",value:err.stack})
  client.users.fetch(mention).then(async user => {
    await user.send({ embeds: [embed]});
  })  
}

client.login(token);
