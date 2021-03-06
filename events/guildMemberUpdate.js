const guildTokenSchema = require('../schema/childschema/boosttoken.js')
const claimedSchema = require("../schema/childschema/claimedroleschema.js")
const { nanoid } = require('nanoid')
const { MessageEmbed } = require('discord.js')
const staffPing = require('../schema/childschema/guilddata.js')
const { prefix } = process.env;
const shortid = require('shortid')
const axios = require('axios')
module.exports = async(client, oldMember, newMember)=>{
    
    const query = await staffPing.find({guildID : newMember.guild.id})
    if(query.length == 0) return 

    const boostroleid = query[0].boosterRole
    if(boostroleid === undefined) return

    const indexOldMember = oldMember._roles.indexOf(boostroleid)
    const indexNewMember = newMember._roles.indexOf(boostroleid)
    if(indexOldMember == -1 && indexNewMember != -1){
        const token = shortid.generate()
        const { guild } = newMember
        
        const boostMemberId = newMember.user.id
        const guildMemberData = guild.members.cache.get(boostMemberId)
        const boostMemberGuildId = newMember.guild.id
        const boostMemberGuildName = newMember.guild.name


        await guildTokenSchema.findOneAndUpdate({
            userID: boostMemberId,
            guildID: boostMemberGuildId
        },{
            userID: boostMemberId,
            guildID: boostMemberGuildId,
            $set:{
                token: token
            }
        },{
            upsert: true
        }).then((data, error)=>{
            if(error){
                return guildMemberData.send("Hi! this is the automated custom role system. Unfortunately, we are experiencing issues with the system. To claim your free role, please dm one of the staffs to claim it!")
            }else{
                const boostEmbed = new MessageEmbed()
                    .setTitle(`Thank you so much for boosting the server ${boostMemberGuildName}!!!`)
                    .setAuthor('You will be eligible to claim a free custom role from your boost!')
                    .setDescription(`To claim your free role, please enter the claim role command i have provided in the server you boosted. `)
                    .addField("Your token is : ", `*${token}*`)
                    .addField("Claim Role Command : ", `${prefix} createcard ${token}`)
                guildMemberData.send(boostEmbed).catch(error =>{
                    console.log(error)
                })
            }
        })
    }




    if(indexOldMember != -1 && indexNewMember == -1){
        const { guild } = newMember
        
        const boostMemberId = newMember.user.id
        const guildMemberData = guild.members.cache.get(boostMemberId)
        const boostMemberGuildId = newMember.guild.id
        const boostMemberGuildName = newMember.guild.name

        const roledata = await claimedSchema.find({userID : boostMemberId, guildID : boostMemberGuildId})
        if(roledata.length == 0) return
        const roleid = roledata[0].roleID


        const { token } = process.env
        await axios.request({
            method:"DELETE",
            url:`https://discord.com/api/v8/guilds/${guild.id}/roles/${roleid}`,
            headers: {
                "Authorization": `Bot ${token}`
            }
        }).catch()

        await guildTokenSchema.find({userID : boostMemberId, guildID : boostMemberGuildId}).deleteMany().catch()

        await claimedSchema.find({userID : boostMemberId, guildID : boostMemberGuildId}).deleteMany().then(()=>{
            const expiredEmbed = new MessageEmbed()
                .setTitle(`Your boost has expired in the server ${boostMemberGuildName}!!!`)
                .setAuthor('Your tokens and available custom roles has been deleted.')
                .setDescription(`You won't be able to create a custom role until you boost the server again`)
                .setTimestamp()
            guildMemberData.send(expiredEmbed).catch()
        })
    }
}