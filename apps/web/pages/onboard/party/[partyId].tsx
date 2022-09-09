/* eslint-disable camelcase */
import { gql, useMutation, useQuery, useSubscription } from "@apollo/client";
import { UserContext } from "@context/eden";
import {
  ENTER_ROOM,
  EXIT_ROOM,
  FIND_ROOM,
  MEMBER_UPDATED,
  ROOM_UPDATED,
  UPDATE_MEMBER,
} from "@graphql/eden";
import { Maybe, Members, SkillType_Member } from "@graphql/eden/generated";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import {
  AppPublicLayout,
  EditProfileOnboardPartyCard,
  GridItemNine,
  GridItemThree,
  GridLayout,
  OnboardPartyContainer,
} from "ui";

import type { NextPageWithLayout } from "../../_app";

const OnboardPartyPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { partyId } = router.query;

  const [members, setMembers] = useState<Members[]>([]);

  const { currentUser } = useContext(UserContext);

  const { data: dataRoom } = useQuery(FIND_ROOM, {
    variables: {
      fields: {
        _id: partyId,
      },
    },
    skip: !partyId,
    context: { serviceName: "soilservice" },
  });

  const { data: dataRoomSubscription } = useSubscription(ROOM_UPDATED, {
    variables: {
      fields: { _id: partyId },
    },
    skip: !partyId,
    context: { serviceName: "soilservice" },
  });

  const membersIds: Array<string> = dataRoomSubscription
    ? dataRoomSubscription.roomUpdated.members.map(
        (member: Members) => member._id
      )
    : dataRoom?.findRoom.members.map((member: Members) => member._id);

  useSubscription(MEMBER_UPDATED, {
    variables: {
      fields: { _id: membersIds },
    },
    skip: !membersIds,
    context: { serviceName: "soilservice" },
    onSubscriptionData: (data) => {
      const newMemberData = data.subscriptionData.data.memberUpdated;

      setMembers(
        members.map((member: Members) => {
          if (member._id !== newMemberData._id) return member;
          return newMemberData;
        })
      );
    },
  });

  const [enterRoom] = useMutation(ENTER_ROOM, {});
  const [exitRoom] = useMutation(EXIT_ROOM, {});

  useEffect(() => {
    // if user logged in and not in party, add currentUser to party
    if (!currentUser || !partyId) return;
    if (
      partyId &&
      !!membersIds?.length &&
      currentUser &&
      membersIds.some((id) => id === currentUser?._id)
    ) {
      return;
    }
    enterRoom({
      variables: {
        fields: {
          roomID: partyId,
          memberID: currentUser?._id,
        },
      },
    });
  }, [currentUser, membersIds, partyId]);

  // Custom query with only members basic data and skills
  useQuery(
    gql`
      query ($fields: findMembersInput) {
        findMembers(fields: $fields) {
          _id
          discordAvatar
          discordName
          bio
          skills {
            skillInfo {
              _id
              name
            }
            level
          }
          links {
            name
            url
          }
        }
      }
    `,
    {
      variables: {
        fields: {
          _id: membersIds,
        },
      },
      skip: !membersIds || members.length === membersIds.length,
      context: { serviceName: "soilservice" },
      onCompleted: (data) => {
        if (data) {
          setMembers(data.findMembers);
        }
      },
    }
  );

  const [updateMember] = useMutation(UPDATE_MEMBER, {});

  const handleSetSkills = (skills: SkillType_Member[]) => {
    if (!partyId || !currentUser) return;

    updateMember({
      variables: {
        fields: {
          _id: currentUser?._id,
          bio: currentUser?.bio,
          skills: skills.map((skill: SkillType_Member) => {
            return {
              id: skill.skillInfo?._id,
              level: skill.level,
            };
          }),
        },
      },
    });
  };
  const handleDeleteSkill = (val: Maybe<SkillType_Member> | undefined) => {
    if (!partyId || !currentUser) return;

    updateMember({
      variables: {
        fields: {
          _id: currentUser?._id,
          skills: currentUser.skills
            ?.filter(
              (skill: Maybe<SkillType_Member>) =>
                skill?.skillInfo?._id !== val?.skillInfo?._id
            )
            .map((skill: Maybe<SkillType_Member>) => {
              return {
                id: skill?.skillInfo?._id,
                level: skill?.level,
              };
            }),
        },
      },
    });
  };
  const handleUpdateUser = (e: any) => {
    if (!partyId || !currentUser) return;

    updateMember({
      variables: {
        fields: {
          _id: currentUser?._id,
          skills: currentUser?.skills?.map((skill: SkillType_Member | null) => {
            return {
              id: skill?.skillInfo?._id,
              level: skill?.level,
            };
          }),
          bio: e.target.name === "bio" ? e.target.value : currentUser.bio,
        },
      },
    });
  };

  useEffect(() => {
    addEventListener(
      "beforeunload",
      (event) => {
        event.preventDefault();
        // exitRoom({
        //   variables: {
        //     fields: {
        //       roomID: partyId,
        //       memberID: currentUser?._id,
        //     },
        //   },
        // });
        event.returnValue = "Are you sure you want to exit?";
      },
      { capture: true }
    );
  }, []);

  return (
    <GridLayout>
      <GridItemThree>
        {!currentUser ? (
          <p>
            You must be logged in to edit your profile.
            <br />
            If you can&rsquo;t log in ask the onboarder for help
          </p>
        ) : (
          <EditProfileOnboardPartyCard
            currentUser={currentUser}
            handleSetSkills={handleSetSkills}
            handleDeleteSkill={handleDeleteSkill}
            handleUpdateUser={handleUpdateUser}
          />
        )}
      </GridItemThree>
      <GridItemNine>
        <OnboardPartyContainer members={members} />
      </GridItemNine>
    </GridLayout>
  );
};

OnboardPartyPage.getLayout = (page) => (
  <AppPublicLayout>{page}</AppPublicLayout>
);

export default OnboardPartyPage;
