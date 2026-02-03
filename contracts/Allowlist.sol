// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
* @dev Allowlist transfer protection                   
*/
contract Allowlist {
    using SafeERC20 for IERC20;

    uint24 public constant percentage = 1000;
    mapping(address => mapping(address => uint256)) public allowed_eth; 
    mapping(address => mapping(address => mapping(address => uint256))) public allowed;

    /**
    * @dev 
    * ETH transfer <= 0.1% succeed and add the receiver as a known address        
    * ETH transfer > 0.1% of balance can only be send to a known address                 
    */
    function send_eth(address to) public payable {
        require(to != address(0), "zero address transfer");
        require(msg.value != 0, "zero transfer");
        uint256 balance = (msg.sender).balance + msg.value;
        if(msg.value > (balance * percentage / 1e6)){
            require(allowed_eth[msg.sender][to] != 0, "send_eth: not approved");
            require(allowed_eth[msg.sender][to] < block.number, "send_eth: pending approve");
        } else {
            allowed_eth[msg.sender][to] = block.number;
        }
        (bool _send, ) = to.call{value: msg.value}("");
        require(_send, "Failed to send Ether");
    }

    /**
    * @dev 
    * Token transfer <= 0.1% of balance succeeds and adds the receiver as a known address        
    * Token transfer > 0.1% of balance can only be send to a known address                
    */
    function send(address token, address to, uint256 amount) public {
        require(to != address(0), "zero address transfer");
        require(amount != 0, "zero transfer");
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        if(amount > (balance * percentage / 1e6)){
            require(allowed[msg.sender][to][token] != 0, "send: not approved");
            require(allowed[msg.sender][to][token] < block.number, "send: pending approve");
        } else {
            allowed[msg.sender][to][token] = block.number;
        }
        IERC20(token).safeTransferFrom(msg.sender, to, amount); 
    }

    /**
    * @dev 
    * Remove address from trusted address book             
    */
    function remove(address to, address token) public{
        if(token == address(0)){
            allowed_eth[msg.sender][to] = 0;
        } else {
            allowed[msg.sender][to][token] = 0;
        }
    }
}