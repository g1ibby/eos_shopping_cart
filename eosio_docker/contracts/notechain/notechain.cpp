#include <eosiolib/eosio.hpp>
#include <eosiolib/print.hpp>
#include <eosiolib/asset.hpp>
#include <eosiolib/symbol.hpp>
#include <eosiolib/crypto.h>
#include <eosiolib/transaction.hpp>
#include <eosiolib/singleton.hpp>
#include <string>

using std::string;

using namespace eosio;

CONTRACT notechain : public eosio::contract {
  private:
    bool isnewuser( name user ) {
      auto note_index = _notes.get_index<name("getbyuser")>();
      auto note_iterator = note_index.find(user.value);

      return note_iterator == note_index.end();
    }

    TABLE notestruct {
      uint64_t      prim_key;  // primary key
      name          user;      // account name for the user
      std::string   note;      // the note message
      uint64_t      timestamp; // the store the last update block time

      auto primary_key() const { return prim_key; }
      uint64_t get_by_user() const { return user.value; }
    };

    // create a multi-index table and support secondary key
    typedef eosio::multi_index< name("notestruct"), notestruct,
      indexed_by< name("getbyuser"), const_mem_fun<notestruct, uint64_t, &notestruct::get_by_user> >
      > note_table;

    note_table _notes;
    
    // =======

    TABLE item {
        uint64_t      sku;        // PRIMARY KEY
        name          store;      // Who create item ACCOUNT
        string        commonname; // Name for ITEM
        eosio::asset  amount;     // PRICE
        int64_t       count;      // COUNT

        auto primary_key() const { return sku; }
        name get_store() const { return store; }
        uint64_t get_by_store() const { return store.value; }

    };
    typedef eosio::multi_index< name("item"), item,
            indexed_by< name("getbystore"), const_mem_fun< item, uint64_t, &item::get_by_store > > >
            item_table;

    item_table _items;

    // =======

    TABLE profile {
        // account for store or customer
        name          account;
        std::string   username;
        std::string   address;

        auto primary_key() const { return account.value; }
        uint64_t get_by_user() const { return account.value; }
    };
    typedef eosio::multi_index< name("profiletable"), profile,
      indexed_by< name("getbyuser"), const_mem_fun<profile, uint64_t, &profile::get_by_user> >
      > profile_table;
    
    profile_table _profiles;

    // =======

    struct itempair {
        uint64_t sku;
        int64_t count;
    };
    typedef std::vector<itempair> itemlist;
    TABLE bag {
      
        uint64_t      id;                
        name          owner;         
        name          store;
        string        title;               
        uint16_t      status;            
        eosio::asset  total;
        itemlist      orders;
        uint64_t      receiptId;         

        auto primary_key() const { return owner.value; }
        //auto get_owner() const { return owner; }

    };
    typedef eosio::multi_index< name("bag"), bag>
            bag_table;
    
    bag_table _bags;
    
    enum OrderStatus {
        empty,
        updating_orders,
        waiting_for_store,
        received_by_store,
        ready_for_pickup,
        completed
    };

    // // =======

    TABLE receipt {
      uint64_t      id;
      name          from;
      name          to;
      eosio::asset  amount;
      std::string   memo;

      uint64_t primary_key() const { return id; }
    };

    typedef eosio::multi_index< name("receipt"), receipt>
          receipt_table;
    receipt_table _receipts;

    // // =======

    struct tokentrans {
      name from;
      name to;
      eosio::asset amount;
      string memo;
    };

  public:
    using contract::contract;

    // constructor
    notechain( name receiver, name code, datastream<const char*> ds ):
                contract( receiver, code, ds ),
                _notes( receiver, receiver.value ),
                _items( receiver, receiver.value ),
                _profiles( receiver, receiver.value ),
                _bags( receiver, receiver.value ),
                _receipts( receiver, receiver.value ) {}

    ACTION hi( name user ) {
      require_auth(user);
      print( "Hello, ", name{user} );
    }
    
    ACTION update( name user, std::string& note ) {
      // to sign the action with the given account
      require_auth( user );

      // create new / update note depends whether the user account exist or not
      if (isnewuser(user)) {
        // insert new note
        _notes.emplace( _self, [&]( auto& new_user ) {
          new_user.prim_key    = _notes.available_primary_key();
          new_user.user        = user;
          new_user.note        = note;
          new_user.timestamp   = now();
        });
      } else {
        // get object by secordary key
        auto note_index = _notes.get_index<name("getbyuser")>();
        auto &note_entry = note_index.get(user.value);
        // update existing note
        _notes.modify( note_entry, _self, [&]( auto& modified_user ) {
          modified_user.note      = note;
          modified_user.timestamp = 123459;
        });
      }
    }

    ACTION createprofile( name account, std::string& username, std::string& address ) {
      require_auth( account );

      auto itr = _profiles.find(account.value);
      eosio_assert(itr == _profiles.end(), 
                          "Profile already exists");

      if ( itr == _profiles.end() ) {
        _profiles.emplace(account, [&]( auto& p ) {
            p.account   = account;
            p.username  = username;
            p.address   = address;
        });
        eosio::print("Profile created123: ", name{ account });
      }
    }

    ACTION updateprofile(name account, std::string& username, std::string& address) {
      require_auth( account );

      auto itr = _profiles.find(account.value);
      eosio_assert(itr != _profiles.end(), 
                          "Profile not found");

      _profiles.modify(itr, account, [&](auto& p) {
          p.account = account;
          p.username = username;
          p.address = address;
      });

      eosio::print("Product updated");
    }

    ACTION removeprofile(name account) {
      require_auth( account );

      auto itr = _profiles.find(account.value);
      eosio_assert(itr != _profiles.end(), 
                          "Profile does not exist");

      _profiles.erase(itr);

      eosio::print("Profile deleted: ", name{ account });
    }

    ACTION createitem(name store, uint64_t sku, const std::string& commonname, const eosio::asset& amount, int64_t count) {
      require_auth(store);

      auto itr = _items.find(sku);
      eosio_assert(itr == _items.end(), 
                          "Product SKU already exists, use addproduct() to update count");

      // eosio_assert(count > 0);
      _items.emplace(store, [&](auto& item) {
          item.sku = sku;
          item.store = store;
          item.commonname = commonname;
          item.amount = amount;
          item.count = count;
      });

      eosio::print("Product created: ", sku);
    }

    ACTION updateitem(name store, uint64_t sku, const std::string& commonname, const eosio::asset& amount) {
      require_auth(store);

      auto itr = _items.find(sku);
      eosio_assert(itr != _items.end(), 
                          "Product does not exist, use createitem() first");

      _items.modify(itr, store, [&](auto& item) {
          item.commonname = commonname;
          item.amount = amount;
      });

      eosio::print("Product updated: ", sku);
    }

    ACTION addstock(name store, uint64_t sku, int64_t count) {
      require_auth(store);

      auto itr = _items.find(sku);
      eosio_assert(itr != _items.end(), 
                          "Product does not exist, use createitem() first");

      int64_t remains = itr->count + count;
      eosio_assert(remains >= 0, 
                          "Cannot reduce more than in stock");


      _items.modify(itr, store, [&](auto& item) {
          item.count = remains;
      });

      eosio::print("New item count: ", itr->count);

      if(itr->count == 0)
        eosio::print("remove item to minimize storage use");
    }

    ACTION removeitem(name store, uint64_t sku) {
      require_auth(store);

      auto itr = _items.find(sku);
      eosio_assert(itr != _items.end(), 
                          "Product does not exist");

      _items.erase(itr);

      eosio::print("Product deleted: ", sku);
    }

    ACTION createcart(name owner, name store, const std::string& title) {
      require_auth(owner);

      eosio_assert(owner != store, 
                          "Needs to associate the store where items will come from");

      auto pstore = _profiles.find(store.value);
      eosio_assert(pstore != _profiles.end(), 
                          "Store not found");

      auto bag = _bags.find(owner.value);
      eosio_assert(bag == _bags.end(), 
                          "User has existing cart, only one is allowed for now");

      _bags.emplace(owner, [&](auto& bag) {
          asset thisAmount;
          thisAmount.amount = 0;
          thisAmount.symbol = symbol("SYS", 4);

          bag.id = _bags.available_primary_key();
          bag.owner = owner;
          bag.store = store;
          bag.title = title;
          bag.total = thisAmount;
          bag.status = OrderStatus::empty;
          bag.orders = itemlist{};
      });

      eosio::print("Created cart: ", title, "Start listing items to buy with addtobuy()");
    }

    ACTION addtocart(name owner, uint64_t sku, int64_t count) {
      require_auth(owner);

      auto bag = _bags.find(owner.value);
      eosio_assert(bag != _bags.end(), "Cart does not exist");
      eosio_assert( (bag->status == OrderStatus::empty) ||
                    (bag->status == OrderStatus::updating_orders),
                    "Orders are being processed. Cannot update list");
      
      auto item = _items.find(sku);
      eosio_assert(item != _items.end(), 
                          "Item SKU not found");

      int64_t remains = item->count - count;
      eosio_assert(remains >= 0, 
                          "Store has not enough stock of this item");

      eosio::print("addtocart: passed all assertions..");


      asset thisAmount;
      thisAmount.amount = item->amount.amount * count * 10000;
      thisAmount.symbol = symbol("SYS", 4);
      eosio::print("AMOUNT: ", item->amount.amount * count);
      eosio::print("thisamount: ", thisAmount);

      _bags.modify(bag, owner, [&](auto& b) {
        bool found = false;
        for(auto& order : b.orders) {
          if(order.sku == sku) {
            eosio::print("mod item count");
            found = true;
            order.count += count;
          }
        }
        if(!found) {
          eosio::print("pushback new itempair");
          b.orders.push_back({sku, count});
        }

        b.status = OrderStatus::updating_orders;
        b.total += thisAmount;
      });

      eosio::print("Added to cart: ", sku);
    }

    ACTION clearcart(name owner) {
      require_auth(owner);

      auto bag = _bags.find(owner.value);
      eosio_assert(bag != _bags.end(), 
                          "Cart does not exist");

      _bags.erase(bag);

      eosio::print("Cart removed");
    }

    ACTION checkoutcart(name owner, name store) {
      eosio::require_auth(owner);
      eosio::require_auth(store);

      eosio::print("hihih ");
      auto bag = _bags.find(owner.value);
      eosio_assert(bag != _bags.end(), "Cart does not exist");

      eosio_assert(bag->store == store, "This order is to be fullfilled by another store");
      //eosio_assert(bag->status == bag::OrderStatus::waiting_for_store, "Orders are not yet final");

      int64_t totalAmount = 0;
      bool verified = true;
      for(const auto& order : bag->orders) {

        auto item = _items.find(order.sku);
        if(item == _items.end()) {
          eosio::print("item not found: ", order.sku);
          verified = false;
          break;  
        }

        if(item->count < order.count) {
          eosio::print("not enough stock: ", item->count);
          verified = false;
          break; 
        }

        totalAmount += (item->amount.amount * order.count);
      }

      eosio_assert(verified, "Not all items are in the store inventory");

      eosio::print(totalAmount);
      eosio::print(" | ");
      eosio::print(bag->total.amount / 10000);
      //asset thisAmount{totalAmount, S(4, SYS)};
      eosio_assert(totalAmount == bag->total.amount / 10000, "Total amount dont match ");
      // todo verify account balance
      // ...

      // storage consumption charged to store

      _bags.modify(bag, store, [&](auto& b) {
          b.status = OrderStatus::received_by_store;
      });
      
      eosio::print("Store is preparing items");
    }

    ACTION readycart(name store, name owner) {
      require_auth(store);

      auto bag = _bags.find(owner.value);
      eosio_assert(bag != _bags.end(), "Cart does not exist");
      eosio_assert(bag->store == store, "Cart not assigned to store");
      eosio_assert(bag->status == OrderStatus::received_by_store, "Store has not received the orders");

      for(const auto& order : bag->orders) {
        auto item = _items.find(order.sku);
        if(item != _items.end()) {
          _items.modify(item, store, [&](auto& item) {
            if(order.count <= item.count)
              item.count -= order.count;
            else
              item.count = 0;
          });
        }
      }
      
      _bags.modify(bag, store, [&](auto& b) {
        b.status = OrderStatus::ready_for_pickup;
      });
    }

    ACTION pickup(name owner, name store) {
      require_auth(owner);
      require_auth(store);

      auto bag = _bags.find(owner.value);

      eosio_assert(bag->status == OrderStatus::ready_for_pickup, "Orders not ready");
      eosio_assert(bag != _bags.end(), "Cart does not exist");
    

      eosio::action( std::vector<eosio::permission_level> (1, {owner, name("active")}),
        name("eosio.token"), name("transfer"), tokentrans{owner, store, bag->total, "some memo"}).send();
      // Error 3090003: provided keys, permissions, and delays do not satisfy declared authorizations
      // does not have signatures for it under a provided delay of 0 ms
      // https://eosio.stackexchange.com/questions/270/how-to-do-an-action-in-a-contract-to-transfer-tokens-to-other-user-accounts-with/320#320
      // https://eosio.stackexchange.com/questions/1452/how-to-send-an-action-from-one-contract-to-another

      _receipts.emplace(store, [&](auto& rec) {
        rec.id = _receipts.available_primary_key();
        rec.from = owner;
        rec.to = store;
        rec.amount = bag->total;
        rec.memo = "some_memo";
      });

      // _bags.erase(bag);
      _bags.modify(bag, owner, [&] (auto& b) {
        b.status = OrderStatus::completed;
      });
      eosio::print("Transaction Complete");
    }

    ACTION reactivate(name owner) {
      require_auth(owner);

      auto bag = _bags.find(owner.value);
      eosio_assert(bag != _bags.end(), "Cart not found. Create one with createcart()");
      eosio_assert(bag->status == OrderStatus::completed, "Cart is active, nothing to do here.");

      _bags.modify(bag, owner, [&](auto& b) {
          b.status = OrderStatus::waiting_for_store;
      });

      eosio::print("Reactivated cart: ", bag->title);
    }

};

// EOSIO_DISPATCH( notechain, (update) )
// specify the contract name, and export a public action: update
EOSIO_DISPATCH( notechain, (hi)(update)(createprofile)(updateprofile)(removeprofile)(createitem)(updateitem)(addstock)(removeitem)(createcart)(addtocart)(clearcart)(checkoutcart)(readycart)(pickup)(reactivate) )
