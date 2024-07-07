// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

contract Magang {
    address public owner;
    mapping(address => bool) public is_login;
    mapping(address => string) public role;
    mapping(address => bool) public is_registered;
    mapping(address => string) public name;

    ProfileStruct[] public users;
    ProductStruct[] public products;
    ProductStruct private emptyProduct;

    event registerAction(
        address owner,
        string role,
        string name,
        uint created_at
    );

    event userInteraction(
        address owner,
        string action,
        string name,
        uint created_at
    );

    event productTransaction(
        address owner,
        string product_id,
        string status,
        string note,
        uint created_at
    );

    event logginEvent(address owner, bytes32 desciription, uint256 created_at);

    string[] public Role = ["Admin","Mahasiswa"];

    constructor() {
        owner = msg.sender;
        emptyProduct = ProductStruct("", address(0), "", "", 0);
    }

    struct ProfileStruct {
        address id;
        bool is_login;
        string role;
        string name;
    }

    struct ProductStruct {
        string id;
        address owner;
        string status;
        string metadata;
        uint created_at;
    }

    function checkLoginStatus(address user_id) external view returns (bool) {
        return is_login[user_id];
    }

    function checkRegisterStatus(address user_id) external view returns (bool) {
        return is_registered[user_id];
    }

    function login() external returns (bool) {
        require(is_registered[msg.sender], "User must be registered first");
        is_login[msg.sender] = true;
        changeUserStatus(msg.sender);
        return true;
    }

    function changeUserStatus(address _id) internal {
        ProfileStruct memory user_profile = users[getUserIndex(_id)];
        user_profile.is_login = is_login[_id];
        users[getUserIndex(_id)] = user_profile;

        emit logginEvent(_id, "Change user status", block.timestamp);
    }

    function register(string memory _name, string memory _role)
        external
        returns (bool)
    {
        require(!is_registered[msg.sender], "User is already registered");
        uint256 is_exists_role = 0;
        for (uint256 i = 0; i < Role.length; i++) {
            if (
                keccak256(abi.encodePacked(Role[i])) ==
                keccak256(abi.encodePacked(_role))
            ) {
                is_exists_role++;
            }
        }

        require(is_exists_role != 0, "Invalid role");
        is_registered[msg.sender] = true;
        is_login[msg.sender] = true;
        name[msg.sender] = _name;
        role[msg.sender] = _role;
        users.push(ProfileStruct(msg.sender, true, _role, _name));

        emit registerAction(msg.sender, _role, _name, block.timestamp);
        return true;
    }

    function profileInformation(address _id)
        external
        view
        returns (ProfileStruct memory)
    {
        return users[getUserIndex(_id)];
    }

    function updateProduct(string memory product_id, string memory metadata, string memory status) external returns (bool) {
        require(is_login[msg.sender], "User must be logged in");
        uint256 productIndex = getProductIndex(product_id);
        require(productIndex != type(uint256).max, "Product not found");
        require(products[productIndex].owner == msg.sender || keccak256(abi.encodePacked(role[msg.sender])) == keccak256(abi.encodePacked("Admin")), "Permission denied");
        products[productIndex].metadata = metadata;
        products[productIndex].status = status;

        // Log the product transaction
        emit productTransaction(msg.sender, product_id, status, "Product updated", block.timestamp);

        return true;
    }

    function createProduct(string memory _id, string memory metadata)
        external
        returns (bool)
    {
        require(is_login[msg.sender], "User must be logged in");
        products.push(ProductStruct(_id, msg.sender, "CREATED", metadata, block.timestamp));

        // Log the product transaction
        emit productTransaction(msg.sender, _id, "CREATED", "Product created", block.timestamp);

        return true;
    }

    function getAllProducts() external view returns (ProductStruct[] memory) {
        return products;
    }

    // Function to check if a product exists by ID
    function productExists(string memory productId) public view returns (bool, uint) {
        for (uint i = 0; i < products.length; i++) {
            if (keccak256(abi.encodePacked(products[i].id)) == keccak256(abi.encodePacked(productId))) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    // Function to get a product by ID
    function getProductById(string memory productId) external view returns (ProductStruct memory) {
        (bool exists, uint index) = productExists(productId);
        if (exists) {
            return products[index];
        } else {
            return emptyProduct;
        }
    }

    function getUserIndex(address _id) internal view returns (uint256) {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i].id == _id) {
                return i;
            }
        }
        return type(uint256).max;
    }

    function getProductIndex(string memory _id) internal view returns (uint256) {
        for (uint256 i = 0; i < products.length; i++) {
            if (keccak256(abi.encodePacked(products[i].id)) == keccak256(abi.encodePacked(_id))) {
                return i;
            }
        }
        return type(uint256).max;
    }
}

