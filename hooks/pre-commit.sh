#!/bin/bash
Bold="\e[1m"
Reset="\e[0m"
BlackBg="\e[30m"
Green="\e[32m"
Yellow="\e[33m"
Red="\e[91m"
if [[ -x ./node_modules/.bin/eslint ]]
then
	if ./node_modules/.bin/eslint .
	then
		printf "\n${BlackBg}${Green}Lint passed, honeybunch. Committing...${Reset}\n"
	else
		 printf "${BlackBg}${Red}Lint failed. Aborted commit.${Reset}\n\n"
		exit 1
	fi
else
	printf "\n${BlackBg}${Yellow}CANNOT LINT BECAUSE LOCAL ESLINT IS NOT INSTALLED!!! Committing anyway, but run \`npm install\`, pal.${Reset}\n\n";
fi
