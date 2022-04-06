import { useRouter } from "next/router";
import { Button } from "../../components";
import { callContract } from "../../helpers";
import { useConnectWallet } from "@web3-onboard/react";
import toast from "react-hot-toast";
import { useGetTicket } from "../../queries";
import { useState } from "react";
import {
  getMetadataValue,
  errorNotification,
  loadingNotification,
  dismissNotification,
} from "../../helpers";
import { transformURL } from "../../helpers/ipfs";
import { ethers } from "ethers";
import { useEffect } from "react";

export default function ticket() {
  const { query } = useRouter();
  const [{ wallet }] = useConnectWallet();
  const ticketContract = query.id;
  const [isButtonLoading, setButtonLoading] = useState(false);
  const [refetchInterval, setRefetchInterval] = useState(0);
  const { data, error, isLoading } = useGetTicket(
    ticketContract?.toLowerCase(),
    refetchInterval
  );
  const [noFunds, setNoFunds] = useState(false);
  const [soldOut, setSoldOut] = useState(false);

  useEffect(() => {
    if (ticketContract && !data) {
      setRefetchInterval(1000);
    } else {
      setRefetchInterval(0);
    }
  }, [ticketContract, data]);

  useEffect(() => {
    if (wallet?.accounts[0].balance) {
      checkFunds();
    }
  }, [wallet, data, wallet?.accounts[0].balance]);

  useEffect(() => {
    if (data) {
      const saleData = data.saleData;
      console.log(saleData);
      const supply = saleData.maxSupply;
      const sold = saleData.totalSold;
      if (sold == supply) setSoldOut(true);
    }
  }, [data, wallet?.accounts[0].balance?.MATIC, isButtonLoading]);

  async function checkFunds() {
    try {
      callContract({
        name: "factory",
        provider: wallet?.provider,
        address: ticketContract,
        cb: async (factory) => {
          const price = ethers.utils.formatEther(
            await factory.releaseSalePrice()
          );

          const balance = await wallet?.accounts[0].balance.MATIC;
          if (!balance || balance < price) setNoFunds(true);
        },
      });
    } catch (e) {
      console.log(e);
    }
  }

  if (isLoading) return <div>Loading ticket....</div>;
  if (error) return <div>There was an error: {error?.message}</div>;

  function purchaseTicket() {
    setButtonLoading(true);
    const waitingToConfirm = loadingNotification("Waiting for confirmation");
    try {
      callContract({
        name: "factory",
        provider: wallet?.provider,
        address: ticketContract,
        cb: async (factory) => {
          try {
            const price = await factory.releaseSalePrice();

            const ticket = await factory.mintRelease(
              wallet?.accounts[0].address,
              wallet?.accounts[0].address,
              { value: price.toString() }
            );
            dismissNotification(waitingToConfirm);
            toast
              .promise(
                ticket.wait(),
                {
                  loading: "Purchasing...",
                  success: "success",
                  error: "failed",
                },
                {
                  position: "bottom-center",
                  style: {
                    background: "#94a4bb",
                    padding: "16px",
                  },
                }
              )
              .then((data) => {
                setButtonLoading(false);
                console.log(data);
              })
              .catch((e) => {
                setButtonLoading(false);
                console.log(e);
              });
          } catch (e) {
            setButtonLoading(false);
            dismissNotification(waitingToConfirm);
            console.log(e);
          }
        },
      });
    } catch (e) {
      console.log("ERROR ", e);
      dismissNotification(waitingToConfirm);
      setButtonLoading(false);
    }
    //route to myTickets page
  }

  function EventDataCard() {
    if (!data) return;

    const metadata = data.metadata;
    const image = getMetadataValue(metadata, "image");
    const title = getMetadataValue(metadata, "name");
    const description = getMetadataValue(metadata, "description");
    const date = getMetadataValue(metadata, "date");
    const start = getMetadataValue(metadata, "start");
    const end = getMetadataValue(metadata, "end");
    const venue = getMetadataValue(metadata, "venue");
    const address = getMetadataValue(metadata, "address");
    const genres = getMetadataValue(metadata, "genres");
    const categories = getMetadataValue(metadata, "categories");

    return (
      <div className="grid gap-2">
        <img
          className="w-1/2 rounded-lg lg:col-span-1 lg:col-start-2"
          loading="lazy"
          src={transformURL(image)}
        />
        <div className="sm:order-2 lg:col-span-1 lg:col-start-1 lg:row-start-1">
          <div className="flex-wrap">
            <h1 className="text-5xl">{title}</h1>
            <h1 className="text-3xl">{venue}</h1>
            <h1 className="text-2xl">{address}</h1>
            <div className="flex border-b-2 border-slate-100/[0.6] text-2xl">
              <p>{date}</p>
              <p>,{"  " + start}</p>
              <p>-{end}</p>
            </div>
            <div>
              {categories && <div>Catagories: {categories}</div>}
              {genres && <div className="">Genres: {genres}</div>}
            </div>
            <br></br>
            <h2 className="text-3xl">About</h2>
            <p className="text-l">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="m-10 gap-2 lg:grid-cols-2">
      {data && (
        <div>
          <EventDataCard />
          <br></br>
          {soldOut ? (
            <h1 className="text-4xl">SOLD OUT</h1>
          ) : (
            <Button
              onClick={purchaseTicket}
              isLoading={isButtonLoading}
              disabled={noFunds || isButtonLoading}
            >
              Purchase Ticket at{" "}
              {ethers.utils.formatEther(data?.saleData.salePrice) + " "}
              MATIC
            </Button>
          )}
        </div>
      )}
      <br></br>
    </div>
  );
}
