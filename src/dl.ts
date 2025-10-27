import { bot, Interaction, MessageFlags } from './bot.ts';
import { basename, dirname, extname, join } from '@std/path';

const MaxFileSize = 50 * 1024 * 1024;

const downloadVideo = async (dir: string, url: string) => {
  const path = await Deno.makeTempDir({ dir });

  const args = [
    ['-P', path],
    ['-o', '%(title)s.%(ext)s'],
    url,
  ];

  let command = await new Deno.Command('yt-dlp', {
    stderr: 'piped',
    stdout: 'inherit',
    args: [...args, '--no-playlist'].flat(),
  }).output();

  if (!command.success) {
    command = await new Deno.Command('yt-dlp', {
      stderr: 'piped',
      stdout: 'inherit',
      args: args.flat(),
    }).output();
  }

  const browserProfile = Deno.env.get('BROWSER_PROFILE');
  if (browserProfile && !command.success) {
    command = await new Deno.Command('yt-dlp', {
      stderr: 'piped',
      stdout: 'inherit',
      args: [
        ...args,
        ['--cookies-from-browser', browserProfile],
      ].flat(),
    }).output();
  }

  if (!command.success) {
    throw new Error(new TextDecoder().decode(command.stderr));
  }

  return (await Array.fromAsync(
    Deno.readDir(path),
    (entry) => join(path, entry.name),
  ))[0];
};

const ffmpeg = async (input: string, args: string[], output = 'webm') => {
  const old_dir = dirname(input);
  const dir = await Deno.makeTempDir({ dir: old_dir });

  const command = await new Deno.Command('ffmpeg', {
    stderr: 'inherit',
    stdout: 'inherit',
    args: [
      '-y',
      ['-err_detect', 'ignore_err'],
      ['-fflags', '+discardcorrupt'],
      ['-i', input],
      ['-map', '0:v:0', '-map', '0:a:0?'],
      ['-c:v', 'av1_nvenc'],
      ['-fps_mode:v', 'vfr', '-enc_time_base:v', 'demux'],
      ['-pix_fmt', 'yuv420p'],
      ['-c:a', 'libopus', '-ar', '48000', '-ac', '2', '-b:a', '96k'],
      ['-preset', 'p7'],
      ...args,
      join(dir, basename(input, extname(input)) + '.' + output),
    ].flat(),
  }).output();

  if (!command.success) {
    // throw new Error(JSON.stringify({
    //   stdout: new TextDecoder().decode(command.stdout),
    //   stderr: new TextDecoder().decode(command.stderr),
    // }));
    throw new Error('FFmpeg failed with args: ' + args.join(' '));
  }

  return (await Array.fromAsync(
    Deno.readDir(dir),
    (entry) => join(dir, entry.name),
  ))[0];
};

const compressVideo = async (input: string) => {
  let output = input;

  if ((await Deno.stat(output)).size < MaxFileSize) {
    return output;
  }

  output = await ffmpeg(
    input,
    [
      ['-cq', '50'],
    ].flat(),
  );

  if ((await Deno.stat(output)).size < MaxFileSize) {
    return output;
  }

  output = await ffmpeg(
    input,
    [
      ['-vf', 'scale=-2:360:flags=bicubic'],
      ['-cq', '60'],
    ].flat(),
  );

  if ((await Deno.stat(output)).size < MaxFileSize) {
    return output;
  }

  throw new Error(
    `Video size (${
      (await Deno.stat(output)).size
    } bytes) exceeds limit of ${MaxFileSize} bytes after compression.`,
  );
};

const handleVideo = async (dir: string, url: string) => {
  return await compressVideo(await downloadVideo(dir, url));
};

const handleGif = async (dir: string, url: string) => {
  const input = await downloadVideo(dir, url);

  const output = join(dir, basename(input, extname(input)) + '.avif');

  //   const command = await new Deno.Command('ffmpeg', {
  //     stderr: 'inherit',
  //     stdout: 'inherit',
  //     args: [
  //       ['-discard:a', 'all'],
  //       ['-i', input],
  //       ['-map', '0:v:0', '-an'],
  //       ['-vf', 'scale=-2:360:flags=lanczos,fps=15'],
  //       ['-c:v', 'libsvtav1'],
  //       ['-preset', '6'],
  //       ['-crf', '42'],
  //       ['-b:v', '0'],
  //       ['-pix_fmt', 'yuv420p10le'],
  //       ['-profile:v', '0'],
  //       ['-loop', '0'],
  //       output,
  //     ].flat(),
  //   }).output();

  const command = await new Deno.Command('ffmpeg', {
    stderr: 'inherit',
    stdout: 'inherit',
    args: [
      ['-hide_banner'],
      ['-loglevel', 'error'],
      ['-i', input],
      ['-an'],
      ['-vf', 'scale=-2:360:flags=lanczos,fps=12'],
      ['-loop', '0'], // infinite loop
      ['-c:v', 'libwebp'],
      ['-lossless', '0'], // set "1" for lossless
      ['-q:v', '100'], // 0–100 (lower = better quality, larger)
      ['-compression_level', '6'], // 0–6 (6 = smaller, slower)
      output,
    ].flat(),
  }).output();

  if (!command.success) {
    throw new Error('FFmpeg failed to create gif.');
  }

  if ((await Deno.stat(output)).size < MaxFileSize) {
    return output;
  }

  throw new Error(
    `Gif size (${
      (await Deno.stat(output)).size
    } bytes) exceeds limit of ${MaxFileSize} bytes after compression.`,
  );
};

export const interactionCreate = async (interaction: Interaction) => {
  if (interaction.data?.name !== 'dl') return;

  const url = String(interaction.data?.options?.[0]?.options?.[0]?.value);
  const opt = String(interaction.data?.options?.[0]?.name);

  await bot.helpers.sendFollowupMessage(interaction.token, {
    flags: MessageFlags.SuppressEmbeds,
    content: `Downloading ${url}`,
  });

  let handle;
  if (opt === 'video') {
    handle = handleVideo;
  } else if (opt === 'gif') {
    handle = handleGif;
  }

  if (!handle) {
    throw new Error(`Unknown subcommand: ${opt}`);
  }

  const tempDir = await Deno.makeTempDir({ prefix: 'chuckdl_' });
  try {
    const file = await handle(tempDir, url);

    await bot.helpers.sendFollowupMessage(interaction.token, {
      files: [{
        name: basename(file),
        blob: new Blob([await Deno.readFile(file)]),
      }],
    });
  } finally {
    console.log(`Deleting temp dir ${tempDir}`);
    await Deno.remove(tempDir, { recursive: true });
  }
};
