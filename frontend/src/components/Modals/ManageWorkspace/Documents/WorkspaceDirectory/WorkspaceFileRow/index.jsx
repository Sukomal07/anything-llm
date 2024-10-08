import System from "@/models/system";
import Workspace from "@/models/workspace";
import {
  formatDate,
  getFileExtension,
  middleTruncate,
} from "@/utils/directories";
import showToast from "@/utils/toast";
import {
  ArrowUUpLeft,
  Download,
  Eye,
  File,
  PushPin,
} from "@phosphor-icons/react";
import { memo, useState } from "react";
import { Tooltip } from "react-tooltip";

export default function WorkspaceFileRow({
  item,
  folderName,
  workspace,
  setLoading,
  setLoadingMessage,
  fetchKeys,
  hasChanges,
  movedItems,
}) {
  const onRemoveClick = async () => {
    setLoading(true);

    try {
      setLoadingMessage(`Removing file from workspace`);
      await Workspace.modifyEmbeddings(workspace.slug, {
        adds: [],
        deletes: [`${folderName}/${item.name}`],
      });
      await fetchKeys(true);
    } catch (error) {
      console.error("Failed to remove document:", error);
    }

    setLoadingMessage("");
    setLoading(false);
  };
  const isMovedItem = movedItems?.some((movedItem) => movedItem.id === item.id);
  return (
    <div
      className={`items-center text-white/80 text-xs grid grid-cols-12 py-2 pl-3.5 pr-8 hover:bg-sky-500/20 cursor-pointer ${isMovedItem ? "bg-green-800/40" : "file-row"
        }`}
    >
      <div
        data-tooltip-id={`directory-item-${item.url}`}
        className="col-span-10 w-fit flex gap-x-[4px] items-center relative"
      >
        <File
          className="shrink-0 text-base font-bold w-4 h-4 mr-[3px] ml-3"
          weight="fill"
        />
        <p className="whitespace-nowrap overflow-hidden text-ellipsis">
          {middleTruncate(item.title, 50)}
        </p>
      </div>
      <div className="col-span-2 flex justify-end items-center">
        {hasChanges ? (
          <div className="w-4 h-4 ml-2 flex-shrink-0" />
        ) : (
          <div className="flex gap-x-2 items-center">
            <WatchForChanges
              workspace={workspace}
              docPath={`${folderName}/${item.name}`}
              item={item}
            />
            <DownloadFileButton item={item} />
            <PinItemToWorkspace
              workspace={workspace}
              docPath={`${folderName}/${item.name}`}
              item={item}
            />
            <RemoveItemFromWorkspace item={item} onClick={onRemoveClick} />
          </div>
        )}
      </div>
      <Tooltip
        id={`directory-item-${item.url}`}
        place="bottom"
        delayShow={800}
        className="tooltip invert z-99"
      >
        <div className="text-xs ">
          <p className="text-white">{item.title}</p>
          <div className="flex mt-1 gap-x-2">
            <p className="">
              Date: <b>{formatDate(item?.published)}</b>
            </p>
            <p className="">
              Type: <b>{getFileExtension(item.url).toUpperCase()}</b>
            </p>
          </div>
        </div>
      </Tooltip>
    </div>
  );
}

const PinItemToWorkspace = memo(({ workspace, docPath, item }) => {
  const [pinned, setPinned] = useState(
    item?.pinnedWorkspaces?.includes(workspace.id) || false
  );
  const [hover, setHover] = useState(false);
  const pinEvent = new CustomEvent("pinned_document");

  const updatePinStatus = async () => {
    try {
      if (!pinned) window.dispatchEvent(pinEvent);
      const success = await Workspace.setPinForDocument(
        workspace.slug,
        docPath,
        !pinned
      );

      if (!success) {
        showToast(`Failed to ${!pinned ? "pin" : "unpin"} document.`, "error", {
          clear: true,
        });
        return;
      }

      showToast(
        `Document ${!pinned ? "pinned to" : "unpinned from"} workspace`,
        "success",
        { clear: true }
      );
      setPinned(!pinned);
    } catch (error) {
      showToast(`Failed to pin document. ${error.message}`, "error", {
        clear: true,
      });
      return;
    }
  };

  if (!item) return <div className="w-[16px] p-[2px] ml-2" />;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex gap-x-2 items-center hover:bg-main-gradient p-[2px] rounded ml-2"
    >
      <PushPin
        data-tooltip-id={`pin-${item.id}`}
        data-tooltip-content={
          pinned ? "Un-Pin from workspace" : "Pin to workspace"
        }
        size={16}
        onClick={updatePinStatus}
        weight={hover || pinned ? "fill" : "regular"}
        className="outline-none text-base font-bold flex-shrink-0 cursor-pointer"
      />
      <Tooltip
        id={`pin-${item.id}`}
        place="bottom"
        delayShow={300}
        className="tooltip invert !text-xs"
      />
    </div>
  );
});

const WatchForChanges = memo(({ workspace, docPath, item }) => {
  const [watched, setWatched] = useState(item?.watched || false);
  const [hover, setHover] = useState(false);
  const watchEvent = new CustomEvent("watch_document_for_changes");

  const updateWatchStatus = async () => {
    try {
      if (!watched) window.dispatchEvent(watchEvent);
      const success =
        await System.experimentalFeatures.liveSync.setWatchStatusForDocument(
          workspace.slug,
          docPath,
          !watched
        );

      if (!success) {
        showToast(
          `Failed to ${!watched ? "watch" : "unwatch"} document.`,
          "error",
          {
            clear: true,
          }
        );
        return;
      }

      showToast(
        `Document ${!watched
          ? "will be watched for changes"
          : "will no longer be watched for changes"
        }.`,
        "success",
        { clear: true }
      );
      setWatched(!watched);
    } catch (error) {
      showToast(`Failed to watch document. ${error.message}`, "error", {
        clear: true,
      });
      return;
    }
  };

  if (!item || !item.canWatch) return <div className="w-[16px] p-[2px] ml-2" />;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex gap-x-2 items-center hover:bg-main-gradient p-[2px] rounded ml-2"
    >
      <Eye
        data-tooltip-id={`watch-changes-${item.id}`}
        data-tooltip-content={
          watched ? "Stop watching for changes" : "Watch document for changes"
        }
        size={16}
        onClick={updateWatchStatus}
        weight={hover || watched ? "fill" : "regular"}
        className="outline-none text-base font-bold flex-shrink-0 cursor-pointer"
      />
      <Tooltip
        id={`watch-changes-${item.id}`}
        place="bottom"
        delayShow={300}
        className="tooltip invert !text-xs"
      />
    </div>
  );
});

const RemoveItemFromWorkspace = ({ item, onClick }) => {
  return (
    <div>
      <ArrowUUpLeft
        data-tooltip-id={`remove-${item.id}`}
        data-tooltip-content="Remove document from workspace"
        onClick={onClick}
        className="text-base font-bold w-4 h-4 ml-2 flex-shrink-0 cursor-pointer"
      />
      <Tooltip
        id={`remove-${item.id}`}
        place="bottom"
        delayShow={300}
        className="tooltip invert !text-xs"
      />
    </div>
  );
};


// export const DownloadFileButton = ({ item }) => {
//   console.log(item)
//   const downloadFile = () => {
//     const blob = new Blob([item.content], { type: "application/pdf" });
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", item.title);
//     document.body.appendChild(link);
//     link.click();
//     URL.revokeObjectURL(url);
//     link.remove();
//   };
//   return (
//     <Download
//       data-tooltip-id={`download-${item.id}`}
//       data-tooltip-content="Download file"
//       size={16}
//       onClick={(e) => {
//         e.stopPropagation()
//         downloadFile()
//       }}
//       className="text-base font-bold flex-shrink-0 cursor-pointer ml-2"
//     />
//   );
// };

export const DownloadFileButton = ({ item }) => {
  const downloadFile = async () => {
    try {
      let fileUrl = item.url;

      if (fileUrl.startsWith("file://")) {
        const fileName = fileUrl.replace("file://", "").split('/').pop();
        const encodedTitle = encodeURIComponent(item.title);

        fileUrl = `http://localhost:8888/files/${encodedTitle}`;
        console.log(fileUrl)
      }

      const response = await fetch(fileUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      //TODO: FILES ARE STORED IN D:\anything-llm-collab\server\storage\documents\custom-documents
      // NO THEY ARE STORED IN D:\anything-llm-collab\server\storage\downloadFiles
      //TODO: npx http-server D:\anything-llm-collab\server\storage\documents\custom-documents -p 8080 --cors
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", item.title || "download");
      document.body.appendChild(link);
      link.click();

      URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error("Error downloading file:", error);
      showToast("Failed to download file", "error", { clear: true });
    }
  };

  return (
    <Download
      data-tooltip-id={`download-${item.id}`}
      data-tooltip-content="Download file"
      size={16}
      onClick={(e) => {
        e.stopPropagation();
        downloadFile();
      }}
      className="text-base font-bold flex-shrink-0 cursor-pointer ml-2"
    />
  );
};
