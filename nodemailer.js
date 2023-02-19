const nodemailer = require("nodemailer");
const googleApis = require("googleapis");
const REDIRECT_URI = `https://developers.google.com/oauthplayground`;
const CLIENT_ID = `632976157841-iftll11fo7trp5goc5tn8joqaoibeaov.apps.googleusercontent.com`;
const CLIENT_SECRET = `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`;
const REFRESH_TOKEN = `1//04PlvAUUqeJ04CgYIARAAGAQSNwF-L9Ir41-C9RzQpEVAID1b8hX4dq1EGs6pQ3CywabMuAkPZTOKfBrrk2G6L0dc_Pzar90DveU`;
const authClient = new googleApis.google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
authClient.setCredentials({ refresh_token: REFRESH_TOKEN });
async function mailer(reciever, data) {
  try {
    const ACCESS_TOKEN = await authClient.getAccessToken();
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "gobuddyindia15@gmail.com",
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: ACCESS_TOKEN,
      },
    });
    const details = {
      from: "{ Go.Buddy } <gobuddyindia15@gmail.com>",
      to: reciever,
      subject: "Reset Password",
      text: data,
    };
    const result = await transport.sendMail(details);
    return result;
  } catch (err) {
    return err;
  }
}

module.exports = mailer;
