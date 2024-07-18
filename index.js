const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const { Client } = require('pg');

require('dotenv').config();




const bot = new Telegraf(process.env.BOT_TOKEN);



bot.command("start", (ctx) => {
    ctx.reply("❌Здравсвуйте!\nИспользуйте нашего бота для упрощения модерации своих бесед. Добавьте бота в чат, выдайте ему права администратора и пользуйтесь! Используйте команду /help, если возникнуть вопросы.", {
        reply_to_message_id: ctx.message.message_id
    });

})



bot.command("get_roles", async (ctx) => {
  if (ctx.update.message.chat.type == "private") {

      ctx.reply("❌Warning!❌\n\nЭту команду можно использовать только в групповом чате.", {
          reply_to_message_id: ctx.message.message_id
      });

  }


  else{
    //Администратор считается модератером, только если у него есть title Moderator
    const chat_id = ctx.update.message.chat.id
    let adminsList = await bot.telegram.getChatAdministrators(chat_id)
    let founderName;
    let adminChatsList = [];
    let moderatorList = [];

    //Перебираем список адинимтрсторов

    for (let i = 0; i < adminsList.length; ++i){
        if (adminsList[i].user.username == "gionic_chat_bot"){
            continue;
        }

        else if (adminsList[i].status == "creator"){
            founderName = adminsList[i].user.username
        }

        else if (adminsList[i].custom_title == "Moderator"){
            moderatorList.push(`@${adminsList[i].user.username} `)
        }

        //Это админы
        else{
            adminChatsList.push(`@${adminsList[i].user.username} `)
        }
    }


    function returnArrayAdmins(arr){
        if (arr.length == 0){
            return "Не назначены"
        }

        return arr.join(',');
    }

        

    ctx.reply(`✏Список ролей:\n
👑Владелец: @${founderName}
🔰Администраторы: ${returnArrayAdmins(adminChatsList)}
🎓Модераторы: ${returnArrayAdmins(moderatorList)}`, {
            reply_to_message_id: ctx.message.message_id
    });

      








  }
})





bot.command("set_role", async (ctx) => {
    if (ctx.update.message.chat.type == "private") {

      ctx.reply("❌Warning!❌\n\nЭту команду можно использовать только в групповом чате.", {
          reply_to_message_id: ctx.message.message_id
      });

    }


    else{
        if (ctx.message.reply_to_message) {
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            const replyId = ctx.message.reply_to_message.from.id;
            let replyUser = await bot.telegram.getChatMember(chat_id,replyId)
            
            const name = ctx.message.reply_to_message.from.username

            //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member" || fromUser.status == "restricted"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                //Если используем команду на владельце чата или на боте
                if (replyUser.status == "creator"){
                    ctx.reply("❌Warning!❌\n\nВы не можете использовать эту команду на владельце чата.", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                //Если пытаемя на боте использовать команду
                else if (replyUser.user.username == "gionic_chat_bot"){
                    ctx.reply("❌Warning!❌\n\nЭту команду запрещено использовать на боте", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }



                else{
                    //Проверяем есть ли у бота админка и разрешения на установку других админов
                    let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                    function getBolAdminBots(array){
                        for (let i = 0; i < array.length; ++i){
                            if (array[i].user.username == "gionic_chat_bot"){
                                if (array[i].can_promote_members){
                                    return [true,true];
                                }
                                else{
                                    return [true,false]

                                }
                            }
                        }

                        return [false,false]
                    }

                    let getBotStatus = getBolAdminBots(adminsList)

                    if (getBotStatus[0] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.\n Управление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }

                    else if (getBotStatus[1] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на назначение/удаление администраторов. \n Управление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }



                    else{
                        //У бота есть все права, начинаем смотреть, кто на ком использует команду
                        let custom_title_from_user;
                        let custom_title_reply_user;
                        let can_promote_from_user;

                        for (let i = 0; i < adminsList.length; ++i){
                            //Если у пользователя custon title не Moderator, он распознается как обычный админ

                            if (adminsList[i].user.id == fromId){
                                can_promote_from_user = adminsList[i].can_promote_members
                                custom_title_from_user = adminsList[i].custom_title
                            }

                            else if (adminsList[i].user.id == replyId){
                                
                                custom_title_reply_user = adminsList[i].custom_title
                            }


                        }


                        //Если у пользователя который использует команду custom_title = Moderator, воспринимаем его как модератора.
                        if (custom_title_from_user == "Moderator"){
                            ctx.reply("❌Warning!❌\n\nМодераторы не имеют доступа к этой команде.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        //Если команду использует админ, но у него нет разрешения на удаление/добавление пользователей
                        else if (can_promote_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора в этом чате, однако не имеете полномочий назначать других администраторов (необходимо для добавления модераторов). Обратитесь к владельцу чата за выдачей этой привелегии.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        else{
                            const role = String(ctx.update.message.text.slice(9)).trim();
                            //Проверяем что за роль, и кто кому ее устанавливает

                            //Если администратора пытается установить другого админа, не допускаем
                            if (fromUser.status == "administrator" && role == "Administrator"){
                                ctx.reply("❌Warning!❌\n\nАдминистратор не может назначать других администраторов, только модераторов.", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }

                            //Если администратор пытается поменять роль другому администратору (у которого custom_title != Moderator)

                            else if (fromUser.status == "administrator" && (replyUser.status == "administrator" && custom_title_reply_user != "Moderator")){
                                ctx.reply("❌Warning!❌\n\nАдминистратор не может назначать/менять роли другим администраторам. Только модераторам и обычным пользователям.", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }


                            else{
                                //Устанавливаем роль
                                if (role.length == 0){
                                    ctx.reply("❌Warning!❌\n\nУкажите роль через пробел. Например: /set_role Administrator.\n\nДоступные роли для назначения:\n\nAdministrator\nModerator", {
                                        reply_to_message_id: ctx.message.message_id
                                    });
                                }

                                else if (role ===  "Administrator" || role === "Moderator" || role === "User"){
                                    if (role == "Administrator"){

                                        await bot.telegram.promoteChatMember(chat_id,replyId,{
                                            can_change_info: true,
                                            
                                            can_post_messages: true,
                                            can_edit_messages: true,
                                            can_delete_messages: true,
                                            can_invite_users: true,
                                            can_restrict_members: true,
                                            can_pin_messages: true,
                                            can_promote_members: true,
                                            is_anonymous: false
                                        });

                                        await bot.telegram.setChatAdministratorCustomTitle(chat_id,replyId,"Administrator")

                                        ctx.reply(`✔Администратор @${fromUser.user.username} назначил на пост администратора пользователя @${replyUser.user.username}`, {
                                            reply_to_message_id: ctx.message.message_id
                                        });
                                    }




                                    else if (role == "Moderator"){

                                        await bot.telegram.promoteChatMember(chat_id,replyId,{
                                            can_change_info: true,
                                            
                                            can_post_messages: true,
                                            can_edit_messages: true,
                                            can_delete_messages: true,
                                            can_invite_users: true,
                                            can_restrict_members: true,
                                            can_pin_messages: true,
                                            can_promote_members: false,
                                            is_anonymous: false
                                        });

                                        await bot.telegram.setChatAdministratorCustomTitle(chat_id,replyId,"Moderator")

                                        ctx.reply(`✔Администратор @${fromUser.user.username} назначил на пост модератора пользователя @${replyUser.user.username}`, {
                                            reply_to_message_id: ctx.message.message_id
                                        });
                                    }



                                    else if (role == "User"){
                                        //Проверяем кем был пользователь
                                        if (replyUser.status == "member"){
                                            ctx.reply(`✏Пользователь и так имеет роль пользователя.`, {
                                                reply_to_message_id: ctx.message.message_id
                                            });

                                        }


                                        else{
                                            await bot.telegram.promoteChatMember(chat_id,replyId,{
                                                can_change_info: false,
                                                can_post_messages: false,
                                                can_edit_messages: false,
                                                can_delete_messages: false,
                                                can_invite_users: false,
                                                can_restrict_members: false,
                                                can_pin_messages: false,
                                                can_promote_members: false,
                                                custom_title: '',
                                                is_anonymous: false
                                            });


                                            ctx.reply(`✔Администратор @${fromUser.user.username} снаял права администратора/модератора с пользователя @${replyUser.user.username}`, {
                                                reply_to_message_id: ctx.message.message_id
                                            });


                                        }

                                        
                                    }

                                }


                                else{
                                    ctx.reply("❌Warning!❌\n\nНеизвестная роль для установки. Используйте допустимые роли:\n\nModerator\nAdministrator", {
                                        reply_to_message_id: ctx.message.message_id
                                    });
                                }
                            }


                        }
                    }
                }
            }
        }




        else{

            ctx.reply("❌Warning!❌\n\nЭту команду необходимо использовать ответом на сообщение пользователя.", {
                reply_to_message_id: ctx.message.message_id
            });

        }


    }

})




bot.command("mute",async (ctx) => {
    if (ctx.update.message.chat.type == "private") {

      ctx.reply("❌Warning!❌\n\nЭту команду можно использовать только в групповом чате.", {
          reply_to_message_id: ctx.message.message_id
      });

    }


    else{


        if (ctx.message.reply_to_message) {
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            const replyId = ctx.message.reply_to_message.from.id;
            let replyUser = await bot.telegram.getChatMember(chat_id,replyId)
            
            const name = ctx.message.reply_to_message.from.username


            //Еслиу пользователя нет админки, закрыт доступ

            //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member" || fromUser.status == "restricted"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                //Если используем команду на владельце чата или на боте
                if (replyUser.status == "creator"){
                    ctx.reply("❌Warning!❌\n\nВы не можете использовать эту команду на владельце чата.", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                //Если пытаемя на боте использовать команду
                else if (replyUser.user.username == "gionic_chat_bot"){
                    ctx.reply("❌Warning!❌\n\nЭту команду запрещено использовать на боте", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }



                else{
                    //Проверяем есть ли у бота админка и разрешения на установку других админов
                    let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                    function getBolAdminBots(array){
                        for (let i = 0; i < array.length; ++i){
                            if (array[i].user.username == "gionic_chat_bot"){
                                if (array[i].can_restrict_members && array[i].can_promote_members){
                                    return [true,true,true];
                                }
                                else{

                                    if (array[i].can_restrict_members && array[i].can_promote_members == false){
                                        return [true,true,false];
                                    }

                                    return [true,false,true]   

                                }

                                break;
                            }
                        }

                        return [false,false,false]
                    }

                    let getBotStatus = getBolAdminBots(adminsList)

                    if (getBotStatus[0] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }

                    else if (getBotStatus[1] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на блокировку других игроков в чате.\nУправление группой => Администраторы => Gionic - Chat Bot => Блокировка пользователей", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else if (getBotStatus[2] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на добавление администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else{
                        //У бота есть все права, идем дальше
                        //Проверяем, кто на ком использует команду
                        //У бота есть все права, начинаем смотреть, кто на ком использует команду
                        let custom_title_from_user;
                        let custom_title_reply_user;
                        let can_restrict_from_user;

                        for (let i = 0; i < adminsList.length; ++i){
                            //Если у пользователя custon title не Moderator, он распознается как обычный админ

                            if (adminsList[i].user.id == fromId){
                                can_restrict_from_user = adminsList[i].can_restrict_members
                                custom_title_from_user = adminsList[i].custom_title
                            }

                            else if (adminsList[i].user.id == replyId){
                                
                                custom_title_reply_user = adminsList[i].custom_title
                            }


                        }


                        //Если модератор использует на администраторе

                        if ((fromUser.status == "administrator" && custom_title_from_user == "Moderator") && (replyUser.status=="administrator" && custom_title_reply_user != "Moderator")){
                            ctx.reply("❌Warning!❌\n\nМодератор не может использовать эту команду на администраторе", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        

                        else if ((fromUser.status == "administrator" && custom_title_from_user != "Moderator") && (replyUser.status=="administrator" && custom_title_reply_user != "Moderator")){
                            ctx.reply("❌Warning!❌\n\nАдминистратор не может использовать эту команду на администраторе", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }





                        //Если у админа нет доступа к команде
                        else if (can_restrict_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в беседе, однако не имеете возможности блокировки/выдачи наказния пользователям. Попростие владельца чата выдать вам эту привелегию.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        else{
                            //Проверяем корректна ли дата
                            //Проверяем дату
                            const time = (ctx.update.message.text.slice(5)).trim()

                            if (time.length == 0){
                                ctx.reply("❌Warning!❌\n\nВведите количество минут через пробел, от 1 до 300.", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }

                            else if (isNaN(Number(time))){
                                ctx.reply("❌Warning!❌\n\nВведите корректное число", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }


                            else if (Number(time) <= 0){
                                ctx.reply("❌Warning!❌\n\nЧисло не может быть отрицательным или равняться нулю.", {
                                    reply_to_message_id: ctx.message.message_id
                                });
                            }


                            else if (Number(time) % 1 != 0){
                                ctx.reply("❌Warning!❌\n\nЧисло не может быть дробным.", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }

                            else if (Number(time) > 300){
                                ctx.reply("❌Warning!❌\n\nМаксимальное время мута 300 минут (5 часов).", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }

                            //Если у пользователя уже есть мут
                            else if (replyUser.status == "restricted"){
                                ctx.reply("❌Warning!❌\n\nУ пользователя уже есть мут.", {
                                    reply_to_message_id: ctx.message.message_id
                                });


                            }


                            else{
                                
                                //Дата корректна, применяем
                                const untilDate = Math.floor(Date.now() / 1000) + (Number(time) * 60);

                                try {
                                    await bot.telegram.restrictChatMember(chat_id, replyId, {
                                        permissions: {
                                            can_send_messages: false,
                                            can_send_media_messages: false,
                                            can_send_polls: false,
                                            can_send_other_messages: false,
                                            can_add_web_page_previews: false,
                                            can_change_info: false,
                                            can_invite_users: false,
                                            can_pin_messages: false,
                                        },
                                        until_date: untilDate
                                    });
                                    
                                    ctx.reply(`✔Пользователь @${replyUser.user.username} был замучен администратором @${fromUser.user.username} на ${time} минут(ы).\n\n🆔Замученного пользователя: ${replyUser.user.id}`, {
                                        reply_to_message_id: ctx.message.message_id
                                    });

                                    console.log(await bot.telegram.getChatMember(chat_id,fromId))
                                } catch (error) {
                                    console.error('Error muting chat member:', error);
                                    ctx.reply('Произошла ошибка при муте пользователя.', {
                                        reply_to_message_id: ctx.message.message_id
                                    });
                                }




                            }

                            //Если человек которому выдаем мут имеет статус администратора, сохраняем все то, что у него есть







                                
                            

                        }






                    }
                }
            }

        }


        else{

            ctx.reply("❌Warning!❌\n\nЭту команду необходимо использовать ответом на сообщение пользователя.", {
                reply_to_message_id: ctx.message.message_id
            });

        }






    }

})




bot.command("unmute", async (ctx) => {

    if (ctx.update.message.chat.type == "private") {

      ctx.reply("❌Warning!❌\n\nЭту команду можно использовать только в групповом чате.", {
          reply_to_message_id: ctx.message.message_id
      });

    }


    else{

        if (ctx.message.reply_to_message) {
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            const replyId = ctx.message.reply_to_message.from.id;
            let replyUser = await bot.telegram.getChatMember(chat_id,replyId)
            
            const name = ctx.message.reply_to_message.from.username



            //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member" || fromUser.status == "restricted"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                //Если используем команду на владельце чата или на боте
                if (replyUser.status == "creator"){
                    ctx.reply("❌Warning!❌\n\nВы не можете использовать эту команду на владельце чата.", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                //Если пытаемя на боте использовать команду
                else if (replyUser.user.username == "gionic_chat_bot"){
                    ctx.reply("❌Warning!❌\n\nЭту команду запрещено использовать на боте", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }



                else{
                    //Проверяем есть ли у бота админка и разрешения на установку других админов
                    let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                    function getBolAdminBots(array){
                        for (let i = 0; i < array.length; ++i){
                            if (array[i].user.username == "gionic_chat_bot"){
                                if (array[i].can_restrict_members && array[i].can_promote_members){
                                    return [true,true,true];
                                }
                                else{

                                    if (array[i].can_restrict_members && array[i].can_promote_members == false){
                                        return [true,true,false];
                                    }

                                    return [true,false,true]   

                                }

                                break;
                            }
                        }

                        return [false,false,false]
                    }

                    let getBotStatus = getBolAdminBots(adminsList)

                    if (getBotStatus[0] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }

                    else if (getBotStatus[1] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на блокировку других игроков в чате.\nУправление группой => Администраторы => Gionic - Chat Bot => Блокировка пользователей", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else if (getBotStatus[2] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на добавление администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }





                    else{
                        //У бота есть все права, снимаем мут
                        //Смотрим значение can_restrict_memebers у from

                        let can_restrict_from_user;

                        for (let i = 0; i < adminsList.length; ++i){
                            //Если у пользователя custon title не Moderator, он распознается как обычный админ

                            if (adminsList[i].user.id == fromId){
                                can_restrict_from_user = adminsList[i].can_restrict_members
                                
                            }

                        }


                        if (can_restrict_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости наказывать/снимать наказания у пользователей в чате. Попросите владельца выдавть вам эти полномочия.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        else{

                            //Снимаем мут
                            // Снимаем мут с пользователя
                            try {
                                
                                await bot.telegram.restrictChatMember(chat_id, replyId, {
                                    permissions: {
                                        can_send_messages: true,
                                        can_send_media_messages: true,
                                        can_send_polls: true,
                                        can_send_other_messages: true,
                                        can_add_web_page_previews: true,
                                        can_change_info: false,
                                        can_invite_users: true,
                                        can_pin_messages: true,
                                    },
                                    until_date: 0
                                });

                                ctx.reply(`✔Пользователь @${name} был размучен администратором @${fromUser.user.username}.`, {
                                    reply_to_message_id: ctx.message.message_id
                                });
                            } catch (error) {
                                console.error('Error unmuting chat member:', error);
                                ctx.reply('Произошла ошибка при снятии мута с пользователя.', {
                                    reply_to_message_id: ctx.message.message_id
                                });
                            }



                        }



                    }

                }

            }



        }





        else{
            //Тут мы не отвечаем на сообщение, а по id размучиваем
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            



            //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                



                
                //Проверяем есть ли у бота админка и разрешения на установку других админов
                let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                function getBolAdminBots(array){
                    for (let i = 0; i < array.length; ++i){
                        if (array[i].user.username == "gionic_chat_bot"){
                            if (array[i].can_restrict_members && array[i].can_promote_members){
                                return [true,true,true];
                            }
                            else{

                                if (array[i].can_restrict_members && array[i].can_promote_members == false){
                                    return [true,true,false];
                                }

                                return [true,false,true]   

                            }

                            break;
                        }
                    }

                    return [false,false,false]
                }

                let getBotStatus = getBolAdminBots(adminsList)

                if (getBotStatus[0] == false){
                    ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }

                else if (getBotStatus[1] == false){
                    ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на блокировку других игроков в чате.\nУправление группой => Администраторы => Gionic - Chat Bot => Блокировка пользователей", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                else if (getBotStatus[2] == false){
                    ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на добавление администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }



                else{
                    //У бота есть все права, снимаем мут
                    //Смотрим значение can_restrict_memebers у from

                    let can_restrict_from_user;

                    for (let i = 0; i < adminsList.length; ++i){
                        //Если у пользователя custon title не Moderator, он распознается как обычный админ

                        if (adminsList[i].user.id == fromId){
                            can_promote_from_user = adminsList[i].can_restrict_members
                            
                        }

                    }


                    if (can_restrict_from_user == false){
                        ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости наказывать/снимать наказания у пользователей в чате. Попросите владельца выдавть вам эти полномочия.", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else{

                        //Снимаем мут
                        //Проверяем, корректен ли id
                        try{

                            const user_id_unmute = (ctx.update.message.text.slice(7)).trim()
                            let get_chat_memeber = await bot.telegram.getChatMember(chat_id,user_id_unmute)

                            if (get_chat_memeber.status == "creator"){
                                ctx.reply("❌Warning!❌\n\nНельзя использовать эту команду на владельце чата.", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }


                            else if (get_chat_memeber.user.username == "gionic_chat_bot"){
                                ctx.reply("❌Warning!❌\n\nНельзя использовать эту команду на боте", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }


                            else{
                                //Снимаем мут
                                // Снимаем мут с пользователя
                                try {
                                    
                                    await bot.telegram.restrictChatMember(chat_id, user_id_unmute, {
                                        permissions: {
                                            can_send_messages: true,
                                            can_send_media_messages: true,
                                            can_send_polls: true,
                                            can_send_other_messages: true,
                                            can_add_web_page_previews: true,
                                            can_change_info: false,
                                            can_invite_users: true,
                                            can_pin_messages: true,
                                        },
                                        until_date: 0
                                    });

                                    ctx.reply(`✔Пользователь @${get_chat_memeber.user.username} был размучен администратором @${fromUser.user.username}.`, {
                                        reply_to_message_id: ctx.message.message_id
                                    });
                                } catch (error) {
                                    console.error('Error unmuting chat member:', error);
                                    ctx.reply('Произошла ошибка при снятии мута с пользователя.', {
                                        reply_to_message_id: ctx.message.message_id
                                    });
                                }

                            }

                        } catch(error){
                            ctx.reply('✏Произошла ошибка, возможно вы указали неверный id. Попробуйте еще раз, или просто ответьте на сообщение замученного пользователя командой /unmute.', {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }




                        



                    }



                }

                

            }

        }


    }

})







bot.command("kick", async (ctx) => {

    if (ctx.update.message.chat.type == "private") {

      ctx.reply("❌Warning!❌\n\nЭту команду можно использовать только в групповом чате.", {
          reply_to_message_id: ctx.message.message_id
      });

    }


    else{

        if (ctx.message.reply_to_message) {
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            const replyId = ctx.message.reply_to_message.from.id;
            let replyUser = await bot.telegram.getChatMember(chat_id,replyId)
            
            const name = ctx.message.reply_to_message.from.username

             //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member" || fromUser.status == "restricted"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                //Если используем команду на владельце чата или на боте
                if (replyUser.status == "creator"){
                    ctx.reply("❌Warning!❌\n\nВы не можете использовать эту команду на владельце чата.", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                //Если пытаемя на боте использовать команду
                else if (replyUser.user.username == "gionic_chat_bot"){
                    ctx.reply("❌Warning!❌\n\nЭту команду запрещено использовать на боте", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                else{
                    //Проверяем есть ли у бота права
                    //Проверяем есть ли у бота админка и разрешения на установку других админов
                    let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                    function getBolAdminBots(array){
                        for (let i = 0; i < array.length; ++i){
                            if (array[i].user.username == "gionic_chat_bot"){
                                if (array[i].can_restrict_members && array[i].can_promote_members){
                                    return [true,true,true];
                                }
                                else{

                                    if (array[i].can_restrict_members && array[i].can_promote_members == false){
                                        return [true,true,false];
                                    }

                                    return [true,false,true]   

                                }

                                break;
                            }
                        }

                        return [false,false,false]
                    }

                    let getBotStatus = getBolAdminBots(adminsList)

                    if (getBotStatus[0] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }

                    else if (getBotStatus[1] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на блокировку других игроков в чате.", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else if (getBotStatus[2] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на добавление администраторов.", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else{
                        //У бота есть все права, идем дальше
                        //Проверяем, кто использует команду

                        let custom_title_from_user;
                        let custom_title_reply_user;
                        let can_restrict_from_user;
                        let can_promote_from_user;

                        for (let i = 0; i < adminsList.length; ++i){
                            //Если у пользователя custon title не Moderator, он распознается как обычный админ

                            if (adminsList[i].user.id == fromId){
                                can_restrict_from_user = adminsList[i].can_restrict_members
                                custom_title_from_user = adminsList[i].custom_title
                                can_promote_from_user = adminsList[i].can_promote_members
                            }

                            else if (adminsList[i].user.id == replyId){
                                
                                custom_title_reply_user = adminsList[i].custom_title
                            }


                        }


                        //Если модер использует команду, то нет
                        if (custom_title_from_user == "Moderator"){
                            ctx.reply("❌Warning!❌\n\nМодератор не может использовать эту команду.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }



                        //Если администратор пытается кикнуть другого администратора

                        else if ((fromUser.status != "creator" && custom_title_from_user != "Moderator") && (replyUser.status == "administrator" && custom_title_reply_user != "Moderator")){
                            ctx.reply("❌Warning!❌\n\nАдминистратор не может кикать других администраторов.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        //Если у пользователя нет разрешения на кик пользователей
                        else if (can_restrict_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости наказывать/снимать наказания у пользователей в чате. Попросите владельца выдавть вам эти полномочия.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }



                        else if (can_promote_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости снимать других администраторов. Попросите владельца выдавть вам эти полномочия.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }



                        else{
                            //Кикаем
                            //Если админ, снимаем админку
                            if (replyUser.status == "administrator"){
                                await bot.telegram.promoteChatMember(chat_id,replyId,{
                                    can_change_info: false,
                                    can_post_messages: false,
                                    can_edit_messages: false,
                                    can_delete_messages: false,
                                    can_invite_users: false,
                                    can_restrict_members: false,
                                    can_pin_messages: false,
                                    can_promote_members: false,
                                    custom_title: '',
                                    is_anonymous: false
                                });

                            }


                            await bot.telegram.kickChatMember(chat_id,replyId)
                            // Немедленно разбаниваем пользователя
                            await bot.telegram.unbanChatMember(chat_id, replyId);
                            ctx.reply(`✔Пользователь @${replyUser.user.username} был кикнут администратором @${fromUser.user.username}`, {
                                reply_to_message_id: ctx.message.message_id
                            });
                        }



                    }

                }

            }
        }






        else{

            ctx.reply("❌Warning!❌\n\nЭту команду необходимо использовать ответом на сообщение пользователя.", {
                reply_to_message_id: ctx.message.message_id
            });

        }


    }

})



//----------------------------
bot.command("ban", async (ctx) => {

    if (ctx.update.message.chat.type == "private") {

      ctx.reply("❌Warning!❌\n\nЭту команду можно использовать только в групповом чате.", {
          reply_to_message_id: ctx.message.message_id
      });

    }


    else{

        if (ctx.message.reply_to_message) {
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            const replyId = ctx.message.reply_to_message.from.id;
            let replyUser = await bot.telegram.getChatMember(chat_id,replyId)
            
            const name = ctx.message.reply_to_message.from.username

             //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member" || fromUser.status == "restricted"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                //Если используем команду на владельце чата или на боте
                if (replyUser.status == "creator"){
                    ctx.reply("❌Warning!❌\n\nВы не можете использовать эту команду на владельце чата.", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                //Если пытаемя на боте использовать команду
                else if (replyUser.user.username == "gionic_chat_bot"){
                    ctx.reply("❌Warning!❌\n\nЭту команду запрещено использовать на боте", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                else{
                    //Проверяем есть ли у бота права
                    //Проверяем есть ли у бота админка и разрешения на установку других админов
                    let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                    function getBolAdminBots(array){
                        for (let i = 0; i < array.length; ++i){
                            if (array[i].user.username == "gionic_chat_bot"){
                                if (array[i].can_restrict_members && array[i].can_promote_members){
                                    return [true,true,true];
                                }
                                else{

                                    if (array[i].can_restrict_members && array[i].can_promote_members == false){
                                        return [true,true,false];
                                    }

                                    return [true,false,true]   

                                }

                                break;
                            }
                        }

                        return [false,false,false]
                    }

                    let getBotStatus = getBolAdminBots(adminsList)

                    if (getBotStatus[0] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }

                    else if (getBotStatus[1] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на блокировку других игроков в чате.\nУправление группой => Администраторы => Gionic - Chat Bot => Блокировка пользователей", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else if (getBotStatus[2] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на добавление администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }



                    else{
                        //У бота есть все права, идем дальше
                        //Проверяем, кто использует команду

                        let custom_title_from_user;
                        let custom_title_reply_user;
                        let can_restrict_from_user;
                        let can_promote_from_user;

                        for (let i = 0; i < adminsList.length; ++i){
                            //Если у пользователя custon title не Moderator, он распознается как обычный админ

                            if (adminsList[i].user.id == fromId){
                                can_restrict_from_user = adminsList[i].can_restrict_members
                                custom_title_from_user = adminsList[i].custom_title
                                can_promote_from_user = adminsList[i].can_promote_members

                            }

                            else if (adminsList[i].user.id == replyId){
                                
                                custom_title_reply_user = adminsList[i].custom_title
                            }


                        }


                        //Если модер использует команду, то нет
                        if (custom_title_from_user == "Moderator"){
                            ctx.reply("❌Warning!❌\n\nМодератор не может использовать эту команду.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }



                        //Если администратор пытается кикнуть другого администратора

                        else if ((fromUser.status != "creator") && (replyUser.status == "administrator" && custom_title_reply_user != "Moderator")){
                            ctx.reply("❌Warning!❌\n\nАдминистратор не может банить других администраторов/модераторов.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        //Если у пользователя нет разрешения на кик пользователей
                        else if (can_restrict_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости наказывать/снимать наказания у пользователей в чате. Попросите владельца выдавть вам эти полномочия.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }

                        else if (can_promote_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости наказывать/снимать наказания у пользователей в чате. Попросите владельца выдавть вам эти полномочия.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }




                        else{
                            //Кикаем
                            //Если админ, снимаем админку
                            if (replyUser.status == "administrator"){
                                await bot.telegram.promoteChatMember(chat_id,replyId,{
                                    can_change_info: false,
                                    can_post_messages: false,
                                    can_edit_messages: false,
                                    can_delete_messages: false,
                                    can_invite_users: false,
                                    can_restrict_members: false,
                                    can_pin_messages: false,
                                    can_promote_members: false,
                                    custom_title: '',
                                    is_anonymous: false
                                });

                            }


                            await bot.telegram.banChatMember(chat_id,replyId)
                            // Немедленно разбаниваем пользователя
                            
                            ctx.reply(`✔Пользователь @${replyUser.user.username} был забанен администратором @${fromUser.user.username}\n\n🆔Забаненного пользователя: ${replyUser.user.id}`, {
                                reply_to_message_id: ctx.message.message_id
                            });
                        }



                    }

                }

            }
        }






        else{

            ctx.reply("❌Warning!❌\n\nЭту команду необходимо использовать ответом на сообщение пользователя.", {
                reply_to_message_id: ctx.message.message_id
            });

        }


    }

})



//-----------------------------------------------

bot.command("unban", async (ctx) => {

    if (ctx.update.message.chat.type == "private") {

      ctx.reply("❌Warning!❌\n\nЭту команду можно использовать только в групповом чате.", {
          reply_to_message_id: ctx.message.message_id
      });

    }


    else{

        if (ctx.message.reply_to_message) {
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            const replyId = ctx.message.reply_to_message.from.id;
            let replyUser = await bot.telegram.getChatMember(chat_id,replyId)
            
            const name = ctx.message.reply_to_message.from.username



            //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member" || fromUser.status == "restricted"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                //Если используем команду на владельце чата или на боте
                if (replyUser.status == "creator"){
                    ctx.reply("❌Warning!❌\n\nВы не можете использовать эту команду на владельце чата.", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                //Если пытаемя на боте использовать команду
                else if (replyUser.user.username == "gionic_chat_bot"){
                    ctx.reply("❌Warning!❌\n\nЭту команду запрещено использовать на боте", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }



                else{
                    //Проверяем есть ли у бота админка и разрешения на установку других админов
                    let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                    function getBolAdminBots(array){
                        for (let i = 0; i < array.length; ++i){
                            if (array[i].user.username == "gionic_chat_bot"){
                                if (array[i].can_restrict_members && array[i].can_promote_members){
                                    return [true,true,true];
                                }
                                else{

                                    if (array[i].can_restrict_members && array[i].can_promote_members == false){
                                        return [true,true,false];
                                    }

                                    return [true,false,true]   

                                }

                                break;
                            }
                        }

                        return [false,false,false]
                    }

                    let getBotStatus = getBolAdminBots(adminsList)

                    if (getBotStatus[0] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }

                    else if (getBotStatus[1] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на блокировку других игроков в чате.\nУправление группой => Администраторы => Gionic - Chat Bot => Блокировка пользователей", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }


                    else if (getBotStatus[2] == false){
                        ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на добавление администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }




                    else{
                        //У бота есть все права, снимаем мут
                        //Смотрим значение can_restrict_memebers у from

                        let can_restrict_from_user;
                        let custom_title_from_user;

                        for (let i = 0; i < adminsList.length; ++i){
                            //Если у пользователя custon title не Moderator, он распознается как обычный админ

                            if (adminsList[i].user.id == fromId){
                                can_promote_from_user = adminsList[i].can_restrict_members
                                custom_title_from_user = adminsList[i].custom_title_from_user
                                
                            }

                        }


                        if (can_restrict_from_user == false){
                            ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости наказывать/снимать наказания у пользователей в чате. Попросите владельца выдавть вам эти полномочия.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }

                        //Проверяем, если пользователь модератор, он не может разбанить

                        else if (custom_title_from_user == "Moderator" && fromUser.status != "creator"){
                            ctx.reply("❌Warning!❌\n\nУ модераторов нет доступа к этой команде.", {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }


                        else{



                            //Снимаем мут
                            // Снимаем мут с пользователя
                            try {
                                
                                await bot.telegram.unbanChatMember(chat_id,replyId,only_if_banned = true)
                                // Снимаем все ограничения
                                await bot.telegram.restrictChatMember(chat_id, replyId, {
                                    permissions: {
                                        can_send_messages: true,
                                        can_send_media_messages: true,
                                        can_send_polls: true,
                                        can_send_other_messages: true,
                                        can_add_web_page_previews: true,
                                        can_change_info: false,
                                        can_invite_users: true,
                                        can_pin_messages: true,
                                    },
                                    until_date: 0
                                });

                                ctx.reply(`✔Пользователь @${name} был разбанен администратором @${fromUser.user.username}`, {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            } catch (error) {
                                console.error('Error unmuting chat member:', error);
                                ctx.reply('Произошла ошибка при снятии мута с пользователя.', {
                                    reply_to_message_id: ctx.message.message_id
                                });
                            }



                        }



                    }

                }

            }



        }





        else{
            //Тут мы не отвечаем на сообщение, а по id размучиваем
            const chat_id = ctx.update.message.chat.id
            const fromId = ctx.message.from.id;
            let fromUser = await bot.telegram.getChatMember(chat_id,fromId)

            



            //Если у пользователя нет админки, запрет на использование
            if (fromUser.status == "member" || fromUser.status == "restricted"){
                ctx.reply("❌Warning!❌\n\nУ вас нет полномочий на использование этой команды", {
                    reply_to_message_id: ctx.message.message_id
                });

            }


            else{
                



                
                //Проверяем есть ли у бота админка и разрешения на установку других админов
                let adminsList = await bot.telegram.getChatAdministrators(chat_id)

                function getBolAdminBots(array){
                    for (let i = 0; i < array.length; ++i){
                        if (array[i].user.username == "gionic_chat_bot"){
                            if (array[i].can_restrict_members && array[i].can_promote_members){
                                return [true,true,true];
                            }
                            else{

                                if (array[i].can_restrict_members && array[i].can_promote_members == false){
                                    return [true,true,false];
                                }

                                return [true,false,true]   

                            }

                            break;
                        }
                    }

                    return [false,false,false]
                }

                let getBotStatus = getBolAdminBots(adminsList)

                if (getBotStatus[0] == false){
                    ctx.reply("❌Warning!❌\n\nПеред использолвание этой команды назначьте бота администратором в чате, и выдайте ему возможность назначать/удалять администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }

                else if (getBotStatus[1] == false){
                    ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на блокировку других игроков в чате.\nУправление группой => Администраторы => Gionic - Chat Bot => Блокировка пользователей", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }


                else if (getBotStatus[2] == false){
                    ctx.reply("❌Warning!❌\n\nПеред использованием этой команды выдайте боту разрешение на добавление администраторов.\nУправление группой => Администраторы => Gionic - Chat Bot => Добавление администраторов", {
                        reply_to_message_id: ctx.message.message_id
                    });

                }

               


                else{
                    //У бота есть все права, снимаем мут
                    //Смотрим значение can_restrict_memebers у from

                    let can_restrict_from_user;
                    let custom_title_from_user;

                    for (let i = 0; i < adminsList.length; ++i){
                        //Если у пользователя custon title не Moderator, он распознается как обычный админ

                        if (adminsList[i].user.id == fromId){
                            can_promote_from_user = adminsList[i].can_restrict_members;
                            custom_title_from_user = adminsList[i].custom_title;
                            
                        }

                    }


                    if (can_restrict_from_user == false){
                        ctx.reply("❌Warning!❌\n\nВы имеете статус администратора/модератора в чате, однако у вас нет возмонжости наказывать/снимать наказания у пользователей в чате. Попросите владельца выдавть вам эти полномочия.", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }

                    //Если модер, то не может разбанить
                    else if (custom_title_from_user == "Moderator" && fromUser.status != "creator"){

                        ctx.reply("❌Warning!❌\n\nУ модераторов нет доступа к этой команде.", {
                            reply_to_message_id: ctx.message.message_id
                        });

                    }



                    else{

                        //Снимаем мут
                        //Проверяем, корректен ли id
                        try{

                            const user_id_unmute = (ctx.update.message.text.slice(7)).trim()
                            let get_chat_memeber = await bot.telegram.getChatMember(chat_id,user_id_unmute)

                            if (get_chat_memeber.status == "creator"){
                                ctx.reply("❌Warning!❌\n\nНельзя использовать эту команду на владельце чата.", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }


                            else if (get_chat_memeber.user.username == "gionic_chat_bot"){
                                ctx.reply("❌Warning!❌\n\nНельзя использовать эту команду на боте", {
                                    reply_to_message_id: ctx.message.message_id
                                });

                            }


                            else{
                                //Снимаем мут
                                // Снимаем мут с пользователя
                                try {
                                    
                                    await bot.telegram.restrictChatMember(chat_id, user_id_unmute, {
                                        permissions: {
                                            can_send_messages: true,
                                            can_send_media_messages: true,
                                            can_send_polls: true,
                                            can_send_other_messages: true,
                                            can_add_web_page_previews: true,
                                            can_change_info: false,
                                            can_invite_users: true,
                                            can_pin_messages: true,
                                        },
                                        until_date: 0
                                    });

                                    ctx.reply(`✔Пользователь @${get_chat_memeber.user.username} был разбанен администратором @${fromUser.user.username}.`, {
                                        reply_to_message_id: ctx.message.message_id
                                    });
                                } catch (error) {
                                    console.error('Error unmuting chat member:', error);
                                    ctx.reply('Произошла ошибка при снятии мута с пользователя.', {
                                        reply_to_message_id: ctx.message.message_id
                                    });
                                }

                            }

                        } catch(error){
                            ctx.reply('❌Произошла ошибка, возможно вы указали неверный id. Попробуйте еще раз, или просто ответьте на сообщение замученного пользователя командой /unmute.', {
                                reply_to_message_id: ctx.message.message_id
                            });

                        }




                        



                    }



                }

                

            }

        }


    }

})



bot.command("support", async (ctx) => {
    ctx.reply("✏По все вопросам/жалобам/предложениями обращаться: @fuuurex", {
        reply_to_message_id: ctx.message.message_id
    });

})


bot.command("help",async(ctx) => {
    ctx.reply(`✏Список команд бота:\n\n
󾠮/get_roles - Используется для получения списка ролей чата.\n\n
󾠯/set_role - Устанавливает роль пользователю в чате. Команда доступна администраторам и владельцу чата. Используется ответом на сообщение пользователя, которому вы хотите установить роль. Синтаксис: /set_role <название роли>. Доступные роли для назначения: Administrator, Moderator, User.\nРоль User применяется для снятия прав с администраторов и модераторов.\n\n
󾠰/help - Получения списка всех команд бота.\n\n
󾠱/mute - Устанавливает запрет на отправку сообщений в чат на определнный срок. Доступна модераторам, администраторам и владельцу. Используется ответом на сообщения пользователя которому вы хотите выдать мут. Синтаксис: /mute <кол-во минут> от 1 до 300.\n📛Важно!📛При использовании этой команды на администраторе/модераторе у него пропадет админка, не забудьте вернуть ее обратно командой /set_role.\n\n
󾠲/kick - Кикает пользователя из беседы. Используется ответом на сообщения пользователя которого хотите кикнуть. Разрешается использовать только администраторам и владельцу.\n\n
󾠳/unmute - Снимает мут с ранее наказанного ползователя. Доступна модераторам/администраторам/владельцу. Может использоваться как в качестве ответа на сообщения пользователя, так и отдельно используя /unmute <id пользователя>.\n\n
󾠴/ban - Блокирует пользователя и исключает кго из чата. Доступна администраторам и модераторам. Используется в качестве ответа на сообщения. При блокировке пользователь больше не сможет вступить в чат, пока его не разбанит администрация.\n\n
󾠶/unban - Разбанивает ранее забаненного пользователя. После этого он может присоединиться к беседе. Доступна администраторам и владельцу.\n\n
󾠮󾠷/support - Используйте для связи с тех.поддержкой

`,{
    reply_to_message_id:ctx.message.message_id
})







})










bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
