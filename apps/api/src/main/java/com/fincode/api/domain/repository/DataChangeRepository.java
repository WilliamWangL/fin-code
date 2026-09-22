package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.DataChange;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DataChangeRepository extends JpaRepository<DataChange, Long> {

    List<DataChange> findByDataset(String dataset);
}
