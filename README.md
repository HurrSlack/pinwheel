# Pinwheel
tweet pinned slack messages

To set up:

- Clone
- Create a slack but integration in slack, note the token
- Create a twitter app, note the tokens
- Create a slack username (for logging into the web interface to take log screenshots)
- create a file called "env_variables" in the root of the project with the following format:

```
SLACK_TOKEN=XXX
TWITTER_CONSUMER_KEY=XXX
TWITTER_CONSUMER_SECRET=XXX
TWITTER_ACCESS_TOKEN=XXX
TWITTER_ACCESS_TOKEN_SECRET=XXX
SLACK_USERNAME=XXX
SLACK_PASSWORD=XXX
```

run ```node app.js```

