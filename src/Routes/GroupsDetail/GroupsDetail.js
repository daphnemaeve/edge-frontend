import React, {
  Fragment,
  useEffect,
  useRef,
  Suspense,
  lazy,
  useState,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { PageHeader, Main } from '@redhat-cloud-services/frontend-components';
import {
  Breadcrumb,
  BreadcrumbItem,
  Skeleton,
  Stack,
  StackItem,
  Button,
} from '@patternfly/react-core';
import { getRegistry } from '@redhat-cloud-services/frontend-components-utilities/files/esm/Registry';
import { routes } from '../../../package.json';
import { loadGroupsDetail } from '../../store/actions';
import {
  groupsDetailReducer,
  groupDevicesInfoReducer,
} from '../../store/reducers';
import GroupsDetailInfo from './GroupsDetailInfo';

import { InventoryTable } from '@redhat-cloud-services/frontend-components/components/esm/Inventory';
import { systemsList } from '../../store/groupsDetail';
const InventoryForm = lazy(() => import('../../components/InventoryForm'));
import schema from './addDeviceSchema';
import { updateGroup } from '../../api';

const GroupsDetail = () => {
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const inventory = useRef(null);
  const { uuid } = useParams();
  const dispatch = useDispatch();
  const groupName = useSelector(
    ({ groupsDetailReducer }) => groupsDetailReducer?.name || ''
  );
  const isLoading = useSelector(
    ({ groupsDetailReducer }) => groupsDetailReducer?.isLoading
  );

  const items = useSelector(
    ({ groupsDetailReducer }) =>
      groupsDetailReducer?.devices?.map(({ uuid, ...rest }) => ({
        id: uuid,
        ...rest,
      })),
    shallowEqual
  );
  useEffect(() => {
    const registered = getRegistry().register({
      groupsDetailReducer,
      groupDevicesInfoReducer,
    });
    dispatch(loadGroupsDetail(uuid));
    () => registered();
  }, []);

  const onRefresh = (options, callback) => {
    if (!callback && inventory && inventory.current) {
      inventory.current.onRefreshData(options);
    } else if (callback) {
      callback(options);
    }
  };
  return (
    <Fragment>
      <PageHeader>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={routes.groups}>Groups</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>
            {isLoading === false ? groupName : <Skeleton />}
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeader>
      <Main className="edge-groups--detail">
        <Stack hasGutter>
          <StackItem className="edge-groups--detail__info">
            <GroupsDetailInfo uuid={uuid} />
          </StackItem>
          <StackItem isFilled>
            <InventoryTable
              ref={inventory}
              items={items || []}
              total={items?.length || 0}
              page={1}
              tableProps={{
                canSelectAll: false,
              }}
              isLoaded={!isLoading}
              onRefresh={onRefresh}
              onLoad={({ mergeWithEntities, INVENTORY_ACTION_TYPES }) => {
                getRegistry().register({
                  ...mergeWithEntities(systemsList(INVENTORY_ACTION_TYPES)),
                });
              }}
            >
              <Button onClick={() => setIsAddDeviceOpen(true)}>
                Add device
              </Button>
            </InventoryTable>
          </StackItem>
        </Stack>
      </Main>
      {isAddDeviceOpen && (
        <Suspense fallback="">
          <InventoryForm
            selectedSystems={items}
            schema={schema}
            isOpened={isAddDeviceOpen}
            title="Add new device"
            onAction={(isSubmit, values) => {
              if (isSubmit) {
                (async () => {
                  await updateGroup({
                    uuid,
                    systemIDs: values.selected,
                  });
                  dispatch(loadGroupsDetail(uuid));
                })();
              }
              setIsAddDeviceOpen(false);
            }}
          />
        </Suspense>
      )}
    </Fragment>
  );
};

export default GroupsDetail;