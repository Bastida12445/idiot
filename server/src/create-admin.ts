import './config.js';
import { createClient } from '@supabase/supabase-js';
import { stdin, stdout } from 'node:process';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const clientUrl = process.env.VITE_SUPABASE_URL?.trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function prompt(label: string, hidden = false): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) {
    return Promise.reject(new Error('Run npm run create-admin from an interactive terminal.'));
  }

  stdout.write(label);
  return new Promise((resolve, reject) => {
    const previousRawMode = stdin.isRaw;
    let value = '';
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();

    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(previousRawMode);
    };
    const onData = (chunk: string | Buffer) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          cleanup();
          stdout.write('\n');
          reject(new Error('Admin setup cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ') {
          value += character;
          stdout.write(hidden ? '*' : character);
        }
      }
    };

    stdin.on('data', onData);
  });
}

function validPassword(password: string): boolean {
  return password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password);
}

async function main() {
  if (!url || !secret) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in the root .env file.');
  }
  if (!clientUrl) {
    throw new Error('Set VITE_SUPABASE_URL in the root .env file so the website uses the same Supabase project.');
  }
  if (new URL(clientUrl).origin !== new URL(url).origin) {
    throw new Error('VITE_SUPABASE_URL and SUPABASE_URL point to different projects. Update them to the same Supabase URL, then rerun this command.');
  }

  const email = (await prompt('Admin login email (need not be a real inbox): ')).trim().toLowerCase();
  if (!emailPattern.test(email)) throw new Error('Enter an email-shaped login, for example admin@studio.test.');

  const supabase = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userPage, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const existingUser = userPage.users.find(
    (user) => user.email?.toLowerCase() === email,
  );

  if (existingUser) {
    const confirmExisting = (await prompt(
      'This Auth account already exists. Set its password and grant admin access? [y/N]: ',
    )).trim().toLowerCase();
    if (confirmExisting !== 'y' && confirmExisting !== 'yes') {
      console.log('No changes made.');
      return;
    }
  }

  const password = await prompt('Choose a website admin password (not your Gmail password; input hidden): ', true);
  if (!validPassword(password)) {
    throw new Error('Use at least 12 characters with uppercase, lowercase, and a number.');
  }
  const confirmation = await prompt('Confirm password (input hidden): ', true);
  if (password !== confirmation) throw new Error('Passwords do not match.');

  let userId: string;
  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password, email_confirm: true },
    );
    if (error) throw error;
    userId = data.user.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, role: 'admin' }, { onConflict: 'id' });
  if (profileError?.code === '42501') {
    throw new Error(
      'The Auth account was created, but Supabase denied access to public.profiles. Apply supabase/migrations/202611230002_grant_admin_profile_provisioning.sql, then run npm run create-admin again for this email.',
    );
  }
  if (profileError) throw profileError;

  const { data: savedProfile, error: verifyError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();
  if (verifyError) throw verifyError;
  if (savedProfile?.role !== 'admin') {
    throw new Error('The Auth user exists, but its admin profile was not saved. Apply the profile provisioning migration and rerun this command.');
  }

  console.log(`Admin account is ready for ${email}. The address does not need an inbox; no verification or invitation email was sent.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Admin setup failed.');
  process.exitCode = 1;
});
