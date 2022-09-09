import { gql } from "@apollo/client";

export const EXIT_ROOM = gql`
  mutation ($fields: enterRoomInput!) {
    enterRoom(fields: $fields) {
      _id
      name
      members {
        _id
        discordName
        skills {
          skillInfo {
            name
          }
        }
      }
      registeredAt
    }
  }
`;
