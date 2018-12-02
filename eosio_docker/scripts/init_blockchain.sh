#!/usr/bin/env bash
set -o errexit

echo "=== setup blockchain accounts and smart contract ==="

# set PATH
PATH="$PATH:/opt/eosio/bin:/opt/eosio/bin/scripts"

set -m

echo "=== install EOSIO.CDT (Contract Development Toolkit) ==="
apt install /opt/eosio/bin/scripts/eosio.cdt-1.4.1.x86_64.deb

# start nodeos ( local node of blockchain )
# run it in a background job such that docker run could continue
nodeos -e -p eosio -d /mnt/dev/data \
  --config-dir /mnt/dev/config \
  --http-validate-host=false \
  --plugin eosio::producer_plugin \
  --plugin eosio::chain_api_plugin \
  --plugin eosio::http_plugin \
  --plugin eosio::history_api_plugin \
  --http-server-address=0.0.0.0:8888 \
  --access-control-allow-origin=* \
  --contracts-console \
  --verbose-http-errors &
sleep 1s
until curl localhost:8888/v1/chain/get_info
do
  sleep 1s
done

# Sleep for 2 to allow time 4 blocks to be created so we have blocks to reference when sending transactions
sleep 2s
echo "=== setup wallet: eosiomain ==="

# First key import is for eosio system account
cleos wallet create -n eosiomain --to-console | tail -1 | sed -e 's/^"//' -e 's/"$//' > eosiomain_wallet_password.txt
cleos wallet import -n eosiomain --private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

echo "=== setup wallet: notechainwal ==="

# key for eosio account and export the generated password to a file for unlocking wallet later
cleos wallet create -n notechainwal --to-console | tail -1 | sed -e 's/^"//' -e 's/"$//' > notechain_wallet_password.txt

# Owner key for notechainwal wallet  -  owner_key
cleos wallet import -n notechainwal --private-key 5JpWT4ehouB2FF9aCfdfnZ5AwbQbTtHBAwebRXt94FmjyhXwL4K
# Active key for notechainwal wallet -  active_key
cleos wallet import -n notechainwal --private-key 5JD9AGTuTeD5BXZwGQ5AtwBqHK21aHmYnTetHgk1B3pjj7krT8N

# * Replace "notechainwal" by your own wallet name when you start your own project

# create account for notechainacc with above wallet's public keys
# eosio - account than will found the account creation
# notechainacc - new name for account
# owner_key is a public key to be assigned to the owner authority of the account. (See Accounts and Permissions)
# active_key is a public key to be assigned to the active authority of your account, and the second one will be permissioned for the active authority of your account.
cleos create account eosio notechainacc EOS6PUh9rs7eddJNzqgqDx1QrspSHLRxLMcRdwHZZRL4tpbtvia5B EOS8BCgapgYA2L4LJfCzekzeSr3rzgSTUXRXwNi8bNRoz31D14en9

# * Replace "notechainacc" by your own account name when you start your own project


echo "=== setup wallet: customer ==="
cleos wallet import -n notechainwal --private-key 5KV8tMzVzfB824H4on2UeeJXLBGbtqCBkgxzM5ZvPHPZzkUvYiu 
cleos wallet import -n notechainwal --private-key 5JHXHGNjHnL67mNaZEzWu7W72Rc4ZM9EHfWrZHhfrkZs9tae13k 
cleos create account eosio eosterone EOS744BQfCMAsxVCrURSD7eQc1bRuFoJTossxnhs4xx6yDwUop6f7 EOS565tRNrJQe3uLs79yVoX9NJjNrqm6gtpWWx7S655viCP72vgtU
# eosterone -- account customer


echo "=== setup wallet: store ==="
cleos wallet import -n notechainwal --private-key 5K2MDD3xLGCj3SxSLLQfLbRJSUz3rNLiRfw3k4hHDCrtQzhisXV 
cleos wallet import -n notechainwal --private-key 5JNW9WgVY7KrGC6z1MuzsQ5nuWFcsEUgbYNW46QTMX6BD4HLntQ
cleos create account eosio grocery EOS63gpZKJM9gF4jKf8MJFxjeo5SRZiDeg7ZxrARLBqbm5JsBhazt EOS5i1tyhaj6C3PRUbzQcXs82UZQ8yjqbvzNXAzpwuRB1NFEjVv9g
# grocery - account store

echo "=== setup wallet: receiver ==="
cleos wallet import -n notechainwal --private-key 5JwHKp1ruHf52TStsdSFF9Lgr5zuZEhvJke4oTVFKYNvUTUYbVh
cleos wallet import -n notechainwal --private-key 5JosYAtLGsmUNjgsRVTgZF6oRLpDRsrJGNPze14YQR9yrpJW8cz
cleos create account eosio lazyfriend EOS8Ahtd3sB1CvjBgZDufbmXaNfnBKQtaxv9Me2ZCLaWfhVLK9viZ EOS6HjvWwpK2iUxZPsnXWTpqdR3R6MUPnRaWFz3U4Ghs3Mg8t4Xn5
# lazyfriend - account receiver


echo "=== issue SYS tokens and transfer to test account ==="
cleos wallet import -n notechainwal --private-key 5JseSEsoVwBH6WRsx5CWYWAe6pNG9tpSc5ARynxCMzUV3X6T7GA
cleos wallet import -n notechainwal --private-key 5KKNYgqYmzswcSzi26NFhvcNm6SrogAqCqQv6ZDZWbKoFtnyLBe
cleos create account eosio eosio.token EOS6uLiaG26JQYaEacTkGdWcZVtpRZgvEzEhfvEkwXUs4x6uQekMW EOS6e5wudqwZZnQLXHr9vnjfRLMBajKjDuuA8XLJGqfxhA4hrmg2T
cleos set contract eosio.token /opt/eosio/contracts/eosio.token
cleos push action eosio.token create '{"issuer":"eosio.token","maximum_supply":"1000000.0000 SYS","can_freeze":"0","can_recall":"0","can_whitelist":"0"}' -p eosio.token
cleos push action eosio.token issue '{"to":"eosio.token","quantity":"1000.0000 SYS","memo":""}' -p eosio.token

cleos get table eosio.token eosio.token accounts

cleos push action eosio.token transfer '{"from":"eosio.token","to":"eosterone","quantity":"210.0000 SYS","memo":"for testing"}' -p eosio.token
cleos push action eosio.token transfer '{"from":"eosio.token","to":"notechainacc","quantity":"220.0000 SYS","memo":"for 123testing"}' -p eosio.token

cleos get table eosio.token eosterone accounts
cleos get table eosio.token notechainacc accounts


echo "=== deploy smart contract ==="
# $1 smart contract name
# $2 account holder name of the smart contract
# $3 wallet for unlock the account
# $4 password for unlocking the wallet
deploy_contract.sh notechain notechainacc notechainwal $(cat notechain_wallet_password.txt)

echo "=== create user accounts ==="
# script for create data into blockchain
create_accounts.sh

# * Replace the script with different form of data that you would pushed into the blockchain when you start your own project

echo "=== create test profiles ==="

cleos push action notechainacc createprofile '{"account": "eosterone", "username": "EOSTERONE", "address": "manila"}' -p eosterone
cleos push action notechainacc createprofile '{"account": "grocery", "username": "GROCERY", "address": "makati"}' -p grocery
cleos push action notechainacc createprofile '{"account": "lazyfriend", "username": "LAZYFRIEND", "address": "cebu"}' -p lazyfriend
cleos get table notechainacc notechainacc profiletable

echo "=== add items to inventory ==="

cleos push action notechainacc createitem '{"store": "grocery", "sku": "1111", "commonname": "beercan", "amount": "10 SYS", "count": "100"} ' -p grocery
cleos push action notechainacc addstock '{"store": "grocery", "sku": "1111", "count": "-1"}' -p grocery
cleos push action notechainacc createitem '{"store": "grocery", "sku": "1112", "commonname": "infantformula", "amount": "55 SYS", "count": "25"}' -p grocery
cleos push action notechainacc updateitem '{"store": "grocery", "sku": "1112", "commonname": "infantmilk", "amount": "56 SYS"}' -p grocery
cleos get table notechainacc notechainacc item

echo "=== take orders  ==="

cleos push action notechainacc createcart '{"owner": "eosterone", "store": "grocery", "title": "weeklygroceries"}' -p eosterone
cleos push action notechainacc addtocart '{"owner": "eosterone", "sku": "1111", "count": "8"}' -p eosterone
cleos push action notechainacc addtocart '{"owner": "eosterone", "sku": "1112", "count": "2"}' -p eosterone
cleos get table notechainacc notechainacc bag

echo "=== checkout and do transaction ==="

cleos push action notechainacc checkoutcart '{"owner": "eosterone", "store": "grocery"}' -p eosterone -p grocery
cleos push action notechainacc readycart '{"store": "grocery", "owner": "eosterone"}' -p grocery
# cleos push action notechainacc pickup '{"owner": "eosterone", "store": "grocery"}' -p eosterone -p grocery
# cleos get table notechainacc notechainacc bag

# echo "=== check transaction record ==="

# cleos get table notechainacc notechainacc receipt


echo "=== end of setup blockchain accounts and smart contract ==="
# create a file to indicate the blockchain has been initialized
touch "/mnt/dev/data/initialized"

# put the background nodeos job to foreground for docker run
fg %1
