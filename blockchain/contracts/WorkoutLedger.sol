// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WorkoutLedger {
    struct Workout {
        string workoutData;
        uint256 timestamp;
    }

    mapping(address => Workout[]) public userWorkouts;

    event WorkoutLogged(address indexed user, string workoutData, uint256 timestamp);

    function logWorkout(string memory _workoutData) public {
        userWorkouts[msg.sender].push(Workout(_workoutData, block.timestamp));
        emit WorkoutLogged(msg.sender, _workoutData, block.timestamp);
    }

    function getWorkouts() public view returns (Workout[] memory) {
        return userWorkouts[msg.sender];
    }
}