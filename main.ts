// import delay from "jsr:@std/async/delay";

import * as dl from './src/dl.ts';
import {
  ApplicationCommandOptionTypes,
  ApplicationCommandTypes,
  bot,
  Interaction,
  InteractionResponseTypes,
  Message,
  MessageFlags,
} from './src/bot.ts';

const { SuppressEmbeds, Ephemeral } = MessageFlags;

bot.events.ready = async ({ guilds }) => {
  for (const guildId of guilds) {
    await bot.helpers.upsertGuildApplicationCommands(guildId, [{
      name: 'dl',
      description: 'chuckdl',
      type: ApplicationCommandTypes.ChatInput,
      options: [
        {
          name: 'video',
          description: 'Produce a video file',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'url',
              description: 'Fetch from URL',
              type: ApplicationCommandOptionTypes.String,
              required: true,
            },
          ],
        },
        {
          name: 'gif',
          description: 'Produce a gif',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'url',
              description: 'Fetch from URL',
              type: ApplicationCommandOptionTypes.String,
              required: true,
            },
          ],
        },
      ],
    }, {
      name: 'bump',
      type: ApplicationCommandTypes.Message,
    }]);
  }
};

bot.events.interactionCreate = (interaction: Interaction) => {
  (async () => {
    await bot.helpers.sendInteractionResponse(
      interaction.id,
      interaction.token,
      {
        type: InteractionResponseTypes.DeferredChannelMessageWithSource,
      },
    );

    // const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    // await delay(5000);

    // await bot.helpers.editOriginalInteractionResponse(
    //   interaction.token,
    //   {
    //     content: "Done waiting.",
    //   },
    // );

    // await delay(1000);

    // await bot.helpers.sendFollowupMessage(interaction.token, {
    //   content: "This is a followup message after waiting.",
    // });

    await Promise.all([
      dl.interactionCreate(interaction),
    ]);
  })()
    .catch(async (err) => {
      if (!(err instanceof Error)) return;

      if (err.message.length < 2000) {
        throw err;
      }

      await bot.helpers.sendFollowupMessage(interaction.token, {
        flags: SuppressEmbeds,
        content: '```\n' + err.message + '\n```',
      });
    })
    .catch(console.error);
};

console.log('Starting bot...');
await bot.start();
console.log('Bot started');
