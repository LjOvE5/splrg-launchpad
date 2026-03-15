// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SPLRGLaunchpad is ERC721Enumerable, Ownable {
    using Strings for uint256;

    uint256 public maxSupply = 650;
    uint256 public publicPrice = 0.01 ether;
    uint256 public whitelistPrice = 0.005 ether;
    uint256 public maxPerWallet = 5;

    bool public publicMintActive = false;
    bool public whitelistMintActive = false;
    bool public transfersFrozen = true; // transfers locked until you unfreeze

    string private baseURI;

    mapping(address => uint256) public minted;

    // Whitelist
    mapping(address => bool) public isWhitelisted;

    // Random ID pool: 1..maxSupply
    uint256 private remainingIds = maxSupply;
    mapping(uint256 => uint256) private availableIds;

    constructor() ERC721("SPLRG", "SPLRG") Ownable(msg.sender) {}

    // ========= Metadata =========

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory uri) external onlyOwner {
        baseURI = uri;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        string memory base = _baseURI();
        return bytes(base).length > 0
            ? string(abi.encodePacked(base, tokenId.toString(), ".json"))
            : "";
    }

    // ========= Transfer freeze logic =========

    function setTransfersFrozen(bool frozen) external onlyOwner {
        transfersFrozen = frozen;
    }

    // _update is called on mint, transfer, burn.
    // While frozen, we block transfers (existing owner -> non-zero to),
    // but allow mint (no current owner) and burn (to == address(0)).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address from)
    {
        address currentOwner = _ownerOf(tokenId);

        if (transfersFrozen) {
            bool isMint = (currentOwner == address(0) && to != address(0));
            bool isBurn = (to == address(0));
            bool isTransfer = (!isMint && !isBurn);

            if (isTransfer) {
                revert("Transfers are currently frozen");
            }
        }

        from = super._update(to, tokenId, auth);
    }

    // ========= Random ID selection =========

    function _getRandomTokenId(uint256 random) internal returns (uint256) {
        require(remainingIds > 0, "Sold out");

        uint256 idx = random % remainingIds;

        uint256 tokenId = availableIds[idx];
        if (tokenId == 0) {
            tokenId = idx + 1;
        }

        uint256 last = availableIds[remainingIds - 1];
        if (last == 0) {
            last = remainingIds;
        }

        availableIds[idx] = last;
        delete availableIds[remainingIds - 1];

        remainingIds -= 1;

        return tokenId;
    }

    function _mintRandom(address to) internal {
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao, // post-merge randomness source
                    to,
                    totalSupply()
                )
            )
        );

        uint256 tokenId = _getRandomTokenId(random);
        _safeMint(to, tokenId);
    }

    // ========= Whitelist management =========

    function setWhitelist(address[] calldata addrs, bool status) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            isWhitelisted[addrs[i]] = status;
        }
    }

    // ========= Minting =========

    function togglePublicMint() external onlyOwner {
        publicMintActive = !publicMintActive;
    }

    function toggleWhitelistMint() external onlyOwner {
        whitelistMintActive = !whitelistMintActive;
    }

    function setPublicPrice(uint256 price) external onlyOwner {
        publicPrice = price;
    }

    function setWhitelistPrice(uint256 price) external onlyOwner {
        whitelistPrice = price;
    }

    // Whitelist phase mint
    function whitelistMint(uint256 qty) external payable {
        require(whitelistMintActive, "Whitelist mint closed");
        require(isWhitelisted[msg.sender], "Not whitelisted");
        require(totalSupply() + qty <= maxSupply, "Sold out");
        require(minted[msg.sender] + qty <= maxPerWallet, "Max per wallet");
        require(msg.value >= whitelistPrice * qty, "Not enough ETH");

        minted[msg.sender] += qty;
        for (uint256 i = 0; i < qty; i++) {
            _mintRandom(msg.sender);
        }
    }

    // Public phase mint
    function publicMint(uint256 qty) external payable {
        require(publicMintActive, "Public mint closed");
        require(totalSupply() + qty <= maxSupply, "Sold out");
        require(minted[msg.sender] + qty <= maxPerWallet, "Max per wallet");
        require(msg.value >= publicPrice * qty, "Not enough ETH");

        minted[msg.sender] += qty;
        for (uint256 i = 0; i < qty; i++) {
            _mintRandom(msg.sender);
        }
    }

    // ========= Premint (owner only) =========

    function premint(uint256 qty, address to) external onlyOwner {
        require(totalSupply() + qty <= maxSupply, "Sold out");

        for (uint256 i = 0; i < qty; i++) {
            _mintRandom(to);
            minted[to] += 1;
        }
    }

    // ========= Withdraw =========

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}