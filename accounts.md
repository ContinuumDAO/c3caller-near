# To create a new sub-account:

```cli
near create-account dappv1.hal0177.testnet --new-account-id --accountId hal0177.testnet
```

# To deploy

```cli
near deploy dappv1.hal0177.testnet build/dapp.wasm
```

# To generate key

```cli
near generate-key dappv1.hal0177.testnet
```

# To send 5 NEAR to dappv1.hal0177.testnet from hal0177.testnet

```cli
near send-near hal0177.testnet dappv1.hal0177.testnet 5
```

# To initialize contract

```cli
near call dappv1.hal0177.testnet init '{"c3caller": "c3callerv1.hal0177.testnet", "dapp_id": "42"}' --useAccount dappv1.hal0177.testnet
```

# Testnet

- Master Account: hal0177.testnet
- C3Caller V1: c3callerv1.hal0177.testnet (a8ac2c4979b9190ddf87bbe8139233ad2f12bee506bf042019c604c333904aa4)
- DApp V1: dappv1.hal0177.testnet (385184d73377f48be674414fb80426f26818d4b62bfb8f26935bd2af8137cb15)

