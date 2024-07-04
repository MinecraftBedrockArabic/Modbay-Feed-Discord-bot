const { EmbedBuilder,ActionRowBuilder, ButtonBuilder, ButtonStyle,SlashCommandBuilder,AttachmentBuilder, Options} = require('discord.js');
const ogs = require('open-graph-scraper');
const fs = require('node:fs');


const Youtube = new ButtonBuilder().setLabel('Youtube').setStyle(ButtonStyle.Link).setURL('https://www.youtube.com/@MinecraftBedrockArabic');
const Donate = new ButtonBuilder().setLabel('Donate').setStyle(ButtonStyle.Link).setURL('https://paypal.me/mbarabic');
const row = new ActionRowBuilder().addComponents(Youtube,Donate);

module.exports = {
    data: new SlashCommandBuilder()
                .setName("posts")
                .setDescription("subscribe or unsubscribe from a ModBay creator.")
                .setDMPermission(false)
                .addStringOption(options=>
                    options.setName('type')
                           .setDescription('The type of the command.')
                           .setRequired(true)
                           .addChoices(
                               {name: 'subscribe', value: 'subscribe'},
                               {name: 'unsubscribe', value: 'unsubscribe'}
                           )
                )
                .addStringOption(options=>
                    options.setName('name')
                           .setDescription('creator username in ModBay')
                           .setRequired(true)
                )
                ,

    async execute(interaction){
        const user = interaction.user.id;
        const type = interaction.options.getString('type')
        const creator = interaction.options.getString('name')
        const creatorUrl = `https://modbay.org/user/${creator}/`

        let CreatorPic;
        try {
            const {result} = await ogs({ url: creatorUrl})
            CreatorPic = result
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle("Failed to get the creator profile.")
                .setDescription('Please make sure the creator name is correct and try again.\nSome creators have a different Username and Display Name.')
                .setImage("https://media.discordapp.net/attachments/1225706378673520690/1229892426370650173/image.png")
                .setColor('Red')
            await interaction.reply({ embeds: [embed], components: [row] })
            return
        }
        if(!CreatorPic.success) console.log('failed to get image for ' + creator);

        if(type == 'subscribe'){
            fs.access(`./subscribes/posts/${creator}.json`, async (error) => {
                const json = error?{subscribers:[]}:JSON.parse(fs.readFileSync(`./subscribes/posts/${creator}.json`));
                if(json.subscribers.includes(user)){
                    const embed = new EmbedBuilder()
                        .setAuthor({name:creator,url:creatorUrl,iconURL:CreatorPic?.success?CreatorPic.ogImage[0].url:null})
                        .setTitle('Already Subscribed:')
                        .setDescription(`You are already subscribed to \"${creator}\" posts.`)
                        .setColor('Red');
                    await interaction.reply({embeds: [embed], components: [row]});
                    return;
                } else {
                    json.subscribers.push(user)
                    const embed = new EmbedBuilder()
                        .setAuthor({name:creator,url:creatorUrl,iconURL:CreatorPic?.success?CreatorPic.ogImage[0].url:null})
                        .setTitle(`Successfully Subscribed:`)
                        .setDescription(`You have subscribed to \"${creator}\" posts.\nYou will be notified in DMs when new posts are posted by \"${creator}\".`)
                        .setColor('DarkPurple');
                    await interaction.reply({embeds: [embed], components: [row]})
                }
                fs.writeFile(`./subscribes/posts/${creator}.json`,JSON.stringify(json),function(err){
                    if(err) console.log(err);
                })
            })
        }
        if(type == 'unsubscribe'){
            fs.access(`./subscribes/posts/${creator}.json`, async (error) => {
                const json = error?{subscribers:[]}:JSON.parse(fs.readFileSync(`./subscribes/posts/${creator}.json`));
                if(!json.subscribers.includes(user)){
                    const embed = new EmbedBuilder()
                        .setAuthor({name:creator,url:creatorUrl,iconURL:CreatorPic?.success?CreatorPic.ogImage[0].url:null})
                        .setTitle('Not Subscribed:')
                        .setDescription(`You are not subscribed to \"${creator}\" posts.`)
                        .setColor('Red');
                    await interaction.reply({embeds: [embed], components: [row]});
                    return;
                } else {
                    json.subscribers = json.subscribers.filter(subscriber => subscriber !== user);
                    const embed = new EmbedBuilder()
                        .setAuthor({name:creator,url:creatorUrl,iconURL:CreatorPic?.success?CreatorPic.ogImage[0].url:null})
                        .setTitle('Unsubscribed Successfully:')
                        .setDescription(`You have unsubscribed from \"${creator}\" Posts.`)
                        .setColor('DarkPurple')
                    await interaction.reply({embeds: [embed], components: [row]})
                    fs.writeFile(`./subscribes/posts/${creator}.json`,JSON.stringify(json),function(err){
                        if(err) console.log(err);
                    })
                }

            })
        }

    },
}